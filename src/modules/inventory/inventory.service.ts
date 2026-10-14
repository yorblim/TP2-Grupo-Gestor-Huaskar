import { randomUUID } from "node:crypto";
import { serialTransaction, lockProducts } from "../../lib/transaction";
import { consumeFromBatches } from "../batch/batch.service";
import { CreateMovementInput, MovementResponse } from "./inventory.types";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { getPaginationParams, paginatedResult, type PaginatedResult } from "../../utils/pagination";
import { emitEvent } from "../notifications/notifications.service";
function toMovementResponse(movement: any): MovementResponse {
    return {
        id: movement.id,
        productId: movement.productId,
        productName: movement.productName,
        movementType: movement.movementType.toLowerCase() as MovementResponse["movementType"],
        quantity: movement.quantity,
        stockBefore: movement.stockBefore,
        stockAfter: movement.stockAfter,
        reason: movement.reason,
        referenceId: movement.referenceId,
        supplierId: movement.supplierId,
        supplierName: movement.supplierName,
        createdAt: movement.createdAt.toISOString(),
    };
}
export async function getAllMovements(query: Record<string, any> = {}): Promise<PaginatedResult<MovementResponse>> {
    const params = getPaginationParams(query);
    const where: Record<string, any> = {};
    if (query.productId)
        where.productId = query.productId;
    if (query.movementType)
        where.movementType = query.movementType.toUpperCase();
    if (query.startDate || query.endDate) {
        where.createdAt = {};
        if (query.startDate)
            where.createdAt.gte = new Date(query.startDate);
        if (query.endDate)
            where.createdAt.lte = new Date(query.endDate);
    }
    const [movements, total] = await Promise.all([
        prisma.inventoryMovement.findMany({
            where,
            skip: (params.page - 1) * params.limit,
            take: params.limit,
            orderBy: { createdAt: "desc" },
        }),
        prisma.inventoryMovement.count({ where }),
    ]);
    return paginatedResult(movements.map(toMovementResponse), total, params);
}
export async function getMovementById(id: string): Promise<MovementResponse | null> {
    const movement = await prisma.inventoryMovement.findUnique({ where: { id } });
    return movement ? toMovementResponse(movement) : null;
}
export async function getMovementsByProductId(productId: string): Promise<MovementResponse[]> {
    const movements = await prisma.inventoryMovement.findMany({
        where: { productId },
        orderBy: { createdAt: "desc" },
    });
    return movements.map(toMovementResponse);
}
export async function createMovement(data: CreateMovementInput, actorId?: number): Promise<MovementResponse> {
    if (data.movementType !== "adjustment") {
        throw new AppError("Solo se permiten movimientos manuales de tipo 'adjustment'. Las compras y ventas se registran automáticamente.", 400);
    }
    const result = await serialTransaction(async (tx) => {
        await lockProducts(tx, [data.productId]);
        const product = await tx.product.findUnique({ where: { id: data.productId } });
        if (!product) {
            throw new AppError("Producto no encontrado.", 404);
        }
        if (!Number.isInteger(data.quantity) || !data.quantity || !data.reason?.trim())
            throw new AppError("Cantidad entera y motivo requeridos.", 400);
        if (!product.active)
            throw new AppError("Producto desactivado.", 409);
        if (data.quantity > 0)
            await tx.productBatch.create({ data: { productId: product.id, code: "ADJ-" + randomUUID(), quantity: data.quantity, unitCost: product.costPrice } });
        if (data.quantity < 0)
            await consumeFromBatches(product.id, -data.quantity, tx, undefined, true);
        const stockBefore = product.stock;
        const stockAfter = stockBefore + data.quantity;
        if (stockAfter < 0) {
            throw new AppError("Stock insuficiente para esta operación.", 400);
        }
        await tx.product.update({
            where: { id: data.productId },
            data: { stock: { increment: data.quantity } },
        });
        const movement = await tx.inventoryMovement.create({
            data: {
                productId: data.productId,
                productName: product.name,
                movementType: "ADJUSTMENT",
                quantity: data.quantity,
                stockBefore,
                stockAfter,
                reason: data.reason,
                referenceId: data.referenceId,
            },
        });
        if (actorId) {
            const actor = await tx.user.findUniqueOrThrow({ where: { id: actorId } });
            await tx.auditLog.create({ data: { userId: actorId, userName: actor.email, action: "ADJUSTMENT", entity: "InventoryMovement", entityId: movement.id } });
        }
        return toMovementResponse(movement);
    });
    emitEvent("inventory:movement_created", result);
    return result;
}
