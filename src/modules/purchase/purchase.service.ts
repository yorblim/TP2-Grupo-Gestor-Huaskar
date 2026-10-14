import { money } from "../../utils/money";
import { serialTransaction, lockProducts } from "../../lib/transaction";
import { createPurchaseSchema } from "./purchase.validation";
import { emitEvent } from "../notifications/notifications.service";
import { CreatePurchaseOrderInput, PurchaseOrderResponse } from "./purchase.types";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { getPaginationParams, paginatedResult, type PaginatedResult } from "../../utils/pagination";
function toPurchaseOrderResponse(order: any): PurchaseOrderResponse {
    return {
        id: order.id,
        supplierId: order.supplierId,
        supplierName: order.supplierName,
        items: order.items.map((item: any) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: parseFloat(item.unitPrice.toString()),
            subtotal: parseFloat(item.subtotal.toString()),
        })),
        total: parseFloat(order.total.toString()),
        status: order.status.toLowerCase() as "pending" | "received" | "cancelled",
        createdAt: order.createdAt.toISOString(),
        receivedAt: order.receivedAt?.toISOString(),
    };
}
export async function getAllPurchaseOrders(query: Record<string, any> = {}): Promise<PaginatedResult<PurchaseOrderResponse>> {
    const params = getPaginationParams(query);
    const [orders, total] = await Promise.all([
        prisma.purchaseOrder.findMany({
            include: { items: true },
            skip: (params.page - 1) * params.limit,
            take: params.limit,
            orderBy: { createdAt: "desc" },
        }),
        prisma.purchaseOrder.count(),
    ]);
    return paginatedResult(orders.map(toPurchaseOrderResponse), total, params);
}
export async function getPurchaseOrderById(id: string): Promise<PurchaseOrderResponse | null> {
    const order = await prisma.purchaseOrder.findUnique({
        where: { id },
        include: { items: true },
    });
    return order ? toPurchaseOrderResponse(order) : null;
}
export async function createPurchaseOrder(data: CreatePurchaseOrderInput): Promise<PurchaseOrderResponse> {
    const parsed = createPurchaseSchema.safeParse(data);
    if (!parsed.success)
        throw new AppError("Datos de compra inválidos.", 400);
    const supplier = await prisma.supplier.findUnique({ where: { id: data.supplierId } });
    if (!supplier) {
        throw new AppError("Proveedor no encontrado.", 404);
    }
    if (!data.items || data.items.length === 0) {
        throw new AppError("La orden debe tener al menos un item.", 400);
    }
    let total = 0;
    const itemsWithNames: {
        productId: string;
        productName: string;
        quantity: number;
        unitPrice: number;
        expirationDate?: Date;
        subtotal: number;
    }[] = [];
    for (const item of data.items) {
        const product = await prisma.product.findUnique({ where: { id: item.productId } });
        if (!product) {
            throw new AppError(`Producto con ID ${item.productId} no encontrado.`, 404);
        }
        if (item.quantity <= 0 || item.unitPrice <= 0) {
            throw new AppError("Cantidad y precio unitario deben ser mayores a 0.", 400);
        }
        const subtotal = money(item.unitPrice).mul(item.quantity).toNumber();
        total = money(total).plus(subtotal).toNumber();
        itemsWithNames.push({
            productId: item.productId,
            productName: product.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice, expirationDate: item.expirationDate ? new Date(item.expirationDate) : undefined,
            subtotal,
        });
    }
    const order = await prisma.$transaction(async (tx) => {
        const created = await tx.purchaseOrder.create({
            data: {
                supplierId: data.supplierId,
                supplierName: supplier.name,
                total,
                status: "PENDING",
                items: {
                    create: itemsWithNames.map((item) => ({
                        productId: item.productId,
                        productName: item.productName,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice, expirationDate: item.expirationDate,
                        subtotal: item.subtotal,
                    })),
                },
            },
        });
        return tx.purchaseOrder.findUnique({
            where: { id: created.id },
            include: { items: true },
        });
    });
    return toPurchaseOrderResponse(order!);
}
export async function receivePurchaseOrder(id: string, actorId?: number): Promise<PurchaseOrderResponse | null> {
    const order = await prisma.purchaseOrder.findUnique({
        where: { id },
        include: { items: true },
    });
    if (!order)
        return null;
    if (order.status === "RECEIVED") {
        throw new AppError("La orden ya ha sido recibida.", 400);
    }
    if (order.status === "CANCELLED") {
        throw new AppError("No se puede recibir una orden cancelada.", 400);
    }
    const updatedOrder = await serialTransaction(async (tx) => {
        const current = await tx.purchaseOrder.findUnique({ where: { id } });
        if (current?.status !== "PENDING")
            throw new AppError("La orden ya fue procesada.", 409);
        await lockProducts(tx, order.items.map(i => i.productId));
        for (const item of order.items) {
            const product = await tx.product.findUnique({ where: { id: item.productId } });
            if (!product) {
                throw new AppError(`El producto "${item.productName}" (ID: ${item.productId}) ya no existe.`, 404);
            }
            if (!product.active)
                throw new AppError("Producto desactivado.", 409);
            if (item.expirationDate && item.expirationDate <= new Date())
                throw new AppError("No se puede recibir un lote vencido.", 409);
            const stockBefore = product.stock;
            const stockAfter = stockBefore + item.quantity;
            await tx.product.update({
                where: { id: item.productId },
                data: { stock: { increment: item.quantity }, costPrice: item.unitPrice },
            });
            const batchCode = `PO-${order.id}-${item.productId}`;
            await tx.productBatch.create({
                data: {
                    productId: item.productId,
                    code: batchCode, unitCost: item.unitPrice, purchaseOrderId: order.id, expirationDate: item.expirationDate,
                    quantity: item.quantity,
                    receivedAt: new Date(),
                },
            });
            await tx.inventoryMovement.create({
                data: {
                    productId: item.productId,
                    productName: product.name,
                    movementType: "PURCHASE",
                    quantity: item.quantity,
                    stockBefore,
                    stockAfter,
                    batchCode,
                    reason: `Recepción de orden de compra ID: ${order.id}`,
                },
            });
        }
        if (actorId) {
            const actor = await tx.user.findUniqueOrThrow({ where: { id: actorId } });
            await tx.auditLog.create({ data: { userId: actor.id, userName: actor.email, action: "RECEIVE", entity: "PurchaseOrder", entityId: id } });
        }
        return tx.purchaseOrder.update({
            where: { id },
            data: {
                status: "RECEIVED",
                receivedAt: new Date(),
            },
            include: { items: true },
        });
    });
    emitEvent("inventory:movement_created", { purchaseOrderId: id });
    return toPurchaseOrderResponse(updatedOrder);
}
export async function cancelPurchaseOrder(id: string): Promise<PurchaseOrderResponse | null> {
    const order = await prisma.purchaseOrder.findUnique({
        where: { id },
        include: { items: true },
    });
    if (!order)
        return null;
    if (order.status === "RECEIVED") {
        throw new AppError("No se puede cancelar una orden ya recibida.", 400);
    }
    if (order.status === "CANCELLED") {
        throw new AppError("La orden ya está cancelada.", 400);
    }
    const updatedOrder = await serialTransaction(async (tx) => {
        const changed = await tx.purchaseOrder.updateMany({ where: { id, status: "PENDING" }, data: { status: "CANCELLED" } });
        if (!changed.count)
            throw new AppError("La orden ya fue procesada.", 409);
        return tx.purchaseOrder.findUniqueOrThrow({ where: { id }, include: { items: true } });
    });
    return toPurchaseOrderResponse(updatedOrder);
}
