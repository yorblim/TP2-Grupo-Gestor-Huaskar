import { CreateSaleInput, SaleResponse } from "./sale.types";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { getPaginationParams, paginatedResult, type PaginatedResult } from "../../utils/pagination";
import { consumeFromBatches } from "../batch/batch.service";
import { emitEvent } from "../notifications/notifications.service";
import { dateRange } from "../../utils/dates";
function toSaleResponse(sale: any): SaleResponse {
    return {
        id: sale.id,
        cashierId: sale.cashierId, cashSessionId: sale.cashSessionId, receiptSeries: sale.receiptSeries, receiptNumber: sale.receiptNumber,
        receiptType: sale.receiptType.toLowerCase() as "boleta" | "factura",
        customerDocType: sale.customerDocType?.toLowerCase() as "dni" | "ruc" | "ce" | "passport" | undefined,
        customerDocNumber: sale.customerDocNumber,
        customerName: sale.customerName,
        customerId: sale.customerId ?? undefined,
        items: sale.items.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: parseFloat(item.unitPrice.toString()),
            subtotal: parseFloat(item.subtotal.toString()),
        })),
        subtotal: parseFloat(sale.subtotal?.toString() || "0"),
        discount: parseFloat(sale.discount?.toString() || "0"),
        tax: parseFloat(sale.tax?.toString() || "0"),
        total: parseFloat(sale.total.toString()),
        paymentMethod: sale.paymentMethod.toLowerCase() as "cash" | "card" | "yape" | "plin",
        payments: (sale.payments || []).map((p: any) => ({
            method: p.method.toLowerCase() as "cash" | "card" | "yape" | "plin",
            amount: parseFloat(p.amount.toString()),
        })),
        status: sale.status.toLowerCase() as "active" | "cancelled",
        createdAt: sale.createdAt.toISOString(),
        cancelledAt: sale.cancelledAt?.toISOString(),
    };
}
export async function getSaleById(id: string): Promise<SaleResponse | null> {
    const sale = await prisma.sale.findUnique({
        where: { id },
        include: { items: true, payments: true },
    });
    return sale ? toSaleResponse(sale) : null;
}
export async function getAllSales(query: Record<string, any> = {}): Promise<PaginatedResult<SaleResponse>> {
    const params = getPaginationParams(query);
    const where: Prisma.SaleWhereInput = {};
    if (query.startDate || query.endDate) where.createdAt = dateRange(query.startDate, query.endDate);
    if (query.paymentMethod) {
        const methods = ["CASH", "CARD", "YAPE", "PLIN"] as const;
        const method = String(query.paymentMethod).toUpperCase();
        if (!methods.includes(method as typeof methods[number])) throw new AppError("Método de pago inválido.", 400);
        const selected = method as typeof methods[number];
        where.AND = [{ OR: [{ paymentMethod: selected }, { payments: { some: { method: selected } } }] }];
    }
    if (query.search) {
        const search = String(query.search).trim().slice(0, 200);
        where.OR = [{ customerName: { contains: search, mode: "insensitive" } }, { customerDocNumber: { contains: search } }];
        const receipt = /^(BI01|FI01)-(\d+)$/i.exec(search);
        if (receipt && Number.isSafeInteger(Number(receipt[2])) && Number(receipt[2]) <= 2147483647)
            where.OR.push({ receiptSeries: receipt[1].toUpperCase(), receiptNumber: Number(receipt[2]) });
    }
    const [sales, total] = await Promise.all([
        prisma.sale.findMany({
            where,
            include: { items: true, payments: true },
            skip: (params.page - 1) * params.limit,
            take: params.limit,
            orderBy: { createdAt: "desc" },
        }),
        prisma.sale.count({ where }),
    ]);
    return paginatedResult(sales.map(toSaleResponse), total, params);
}
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { serialTransaction, lockProducts, lockCash } from "../../lib/transaction";
import { money, saleAmounts } from "../../utils/money";
import { createSaleSchema } from "./sale.validation";
export async function createSale(input: CreateSaleInput, cashierId: number): Promise<SaleResponse> {
    if (!input.items?.length)
        throw new AppError("La venta debe tener al menos un producto.", 400);
    const parsed = createSaleSchema.safeParse(input);
    if (!parsed.success)
        throw new AppError(parsed.error.issues.map(i => i.message).join("; "), 400);
    const data = parsed.data;
    if (!cashierId)
        throw new AppError("Cajero requerido.", 401);
    const requestHash = createHash("sha256").update(JSON.stringify({ ...data, requestId: undefined, items: [...data.items].sort((a, b) => a.productId.localeCompare(b.productId)) })).digest("hex");
    const result = await serialTransaction(async (tx) => {
        await lockCash(tx);
        if (data.requestId) {
            const previous = await tx.sale.findUnique({ where: { requestId: data.requestId }, include: { items: true, payments: true } });
            if (previous) {
                if (previous.cashierId !== cashierId || previous.requestHash !== requestHash)
                    throw new AppError("La clave de venta ya se utilizó para otra operación.", 409);
                return { sale: previous, created: false };
            }
        }
        const cashier = await tx.user.findUnique({ where: { id: cashierId } });
        if (!cashier || !["ADMIN", "CAJERO"].includes(cashier.role))
            throw new AppError("Cajero no autorizado.", 403);
        const session = await tx.cashRegisterSession.findFirst({ where: { openedById: cashierId, status: "OPEN" } });
        if (!session)
            throw new AppError("Abre tu caja antes de registrar una venta.", 409);
        if (data.customerId && !await tx.customer.findUnique({ where: { id: data.customerId } }))
            throw new AppError("Cliente no encontrado.", 404);
        await lockProducts(tx, data.items.map(i => i.productId));
        let subtotal = money(0);
        const snapshots = [];
        for (const item of [...data.items].sort((a, b) => a.productId.localeCompare(b.productId))) {
            const product = await tx.product.findUnique({ where: { id: item.productId } });
            if (!product || !product.active)
                throw new AppError("Producto no encontrado o desactivado.", 404);
            if (product.stock < item.quantity)
                throw new AppError(`Stock insuficiente para "${product.name}".`, 409);
            const sub = money(money(product.price.toString()).mul(item.quantity));
            subtotal = subtotal.plus(sub);
            const batches = await consumeFromBatches(product.id, item.quantity, tx, data.batchCodes?.[product.id]);
            const batchedQuantity = batches.reduce((s, b) => s + b.quantity, 0);
            const cost = batches.reduce((s, b) => s.plus(new Prisma.Decimal(b.unitCost).mul(b.quantity)), money(0)).plus(money(product.costPrice.toString()).mul(item.quantity - batchedQuantity));
            snapshots.push({ product, quantity: item.quantity, sub, batches, unitCost: money(cost.div(item.quantity)) });
        }
        const amounts = saleAmounts(subtotal, data.discount);
        const payments = data.payments?.length ? data.payments : [{ method: data.paymentMethod, amount: amounts.total.toNumber() }];
        const paid = payments.reduce((s, p) => s.plus(money(p.amount)), money(0));
        if (!paid.eq(amounts.total))
            throw new AppError("La suma de los pagos no coincide con el total.", 400);
        const series = data.receiptType === "factura" ? "FI01" : "BI01";
        const sequence = await tx.receiptCounter.upsert({ where: { series }, create: { series, value: 1 }, update: { value: { increment: 1 } } });
        const sale = await tx.sale.create({ data: {
                receiptType: data.receiptType.toUpperCase() as "BOLETA" | "FACTURA", customerDocType: data.customerDocType?.toUpperCase() as "DNI" | "RUC" | "CE" | "PASSPORT" | undefined,
                customerDocNumber: data.customerDocNumber, customerName: data.customerName, customerId: data.customerId,
                ...amounts, paymentMethod: data.paymentMethod.toUpperCase() as "CASH" | "CARD" | "YAPE" | "PLIN",
                cashierId, cashSessionId: session.id, requestId: data.requestId, requestHash, receiptSeries: series, receiptNumber: sequence.value,
                items: { create: snapshots.map(s => ({ productId: s.product.id, productName: s.product.name, quantity: s.quantity, unitPrice: s.product.price, unitCost: s.unitCost, subtotal: s.sub })) },
                payments: { create: payments.map(p => ({ method: p.method.toUpperCase() as "CASH" | "CARD" | "YAPE" | "PLIN", amount: money(p.amount) })) },
            }, include: { items: true, payments: true } });
        for (const s of snapshots) {
            const after = s.product.stock - s.quantity;
            await tx.product.update({ where: { id: s.product.id }, data: { stock: { decrement: s.quantity } } });
            const entries = [...s.batches];
            const remainder = s.quantity - entries.reduce((n, b) => n + b.quantity, 0);
            if (remainder)
                entries.push({ batchCode: "", quantity: remainder, unitCost: s.product.costPrice.toString() });
            let running = s.product.stock;
            for (const batch of entries) {
                await tx.inventoryMovement.create({ data: { productId: s.product.id, productName: s.product.name, movementType: "SALE", quantity: batch.quantity, stockBefore: running, stockAfter: running - batch.quantity, batchCode: batch.batchCode || null, referenceId: sale.id } });
                running -= batch.quantity;
            }
            if (running !== after)
                throw new AppError("Inconsistencia de inventario.", 409);
        }
        await tx.auditLog.create({ data: { userId: cashierId, userName: cashier.email, action: "CREATE", entity: "Sale", entityId: sale.id } });
        return { sale, created: true };
    }).catch(async (error) => {
        if (data.requestId && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            const previous = await prisma.sale.findUnique({ where: { requestId: data.requestId }, include: { items: true, payments: true } });
            if (previous && previous.cashierId === cashierId && previous.requestHash === requestHash)
                return { sale: previous, created: false };
            if (previous)
                throw new AppError("La clave de venta ya se utilizó para otra operación.", 409);
        }
        throw error;
    });
    const response = toSaleResponse(result.sale);
    if (result.created) {
        emitEvent("sale:created", response);
        emitEvent("inventory:movement_created", { productIds: response.items.map(item => item.productId) });
    }
    return response;
}
export async function cancelSale(id: string, actorId?: number): Promise<SaleResponse | null> {
    const sale = await serialTransaction(async (tx) => {
        await lockCash(tx);
        const current = await tx.sale.findUnique({ where: { id }, include: { items: true, payments: true } });
        if (!current)
            return null;
        if (current.status === "CANCELLED")
            throw new AppError("La venta ya está anulada.", 409);
        if (current.cashSessionId) {
            const session = await tx.cashRegisterSession.findUnique({ where: { id: current.cashSessionId } });
            if (session?.status !== "OPEN")
                throw new AppError("No se puede anular una venta de una caja cerrada. Requiere devolución registrada.", 409);
        }
        if (actorId) {
            const actor = await tx.user.findUnique({ where: { id: actorId } });
            if (actor?.role !== "ADMIN")
                throw new AppError("Solo el administrador puede anular ventas.", 403);
        }
        await lockProducts(tx, current.items.map(i => i.productId));
        const movements = await tx.inventoryMovement.findMany({ where: { referenceId: id, movementType: "SALE" } });
        for (const item of current.items) {
            const product = await tx.product.findUniqueOrThrow({ where: { id: item.productId } });
            for (const movement of movements.filter(m => m.productId === item.productId && m.batchCode)) {
                await tx.productBatch.update({ where: { productId_code: { productId: item.productId, code: movement.batchCode! } }, data: { quantity: { increment: movement.quantity } } });
            }
            await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
            await tx.inventoryMovement.create({ data: { productId: item.productId, productName: item.productName || product.name, movementType: "ADJUSTMENT", quantity: item.quantity, stockBefore: product.stock, stockAfter: product.stock + item.quantity, reason: "Anulación de venta", referenceId: id } });
        }
        if (actorId) {
            const actor = await tx.user.findUniqueOrThrow({ where: { id: actorId } });
            await tx.auditLog.create({ data: { userId: actor.id, userName: actor.email, action: "CANCEL", entity: "Sale", entityId: id } });
        }
        return tx.sale.update({ where: { id }, data: { status: "CANCELLED", cancelledAt: new Date() }, include: { items: true, payments: true } });
    });
    if (!sale)
        return null;
    const result = toSaleResponse(sale);
    emitEvent("sale:cancelled", result);
    emitEvent("inventory:movement_created", { productIds: result.items.map(item => item.productId) });
    return result;
}
export async function deleteSale(_id: string): Promise<boolean> {
    throw new AppError("Las ventas se conservan para auditoría. Utiliza la anulación.", 409);
}
