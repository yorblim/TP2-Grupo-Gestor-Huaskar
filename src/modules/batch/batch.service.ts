import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { serialTransaction, lockProducts } from "../../lib/transaction";
import { BatchInput, BatchResponse } from "./batch.types";
import { z } from "zod";
import { emitEvent } from "../notifications/notifications.service";
export const batchSchema = z.object({ productId: z.string().min(1), code: z.string().trim().min(1).max(100), quantity: z.number().int().positive(), expirationDate: z.string().refine(v => /^\d{4}-\d{2}-\d{2}$/.test(v) || !Number.isNaN(new Date(v).getTime())).transform(v => /^\d{4}-\d{2}-\d{2}$/.test(v) ? v + "T23:59:59-05:00" : v).nullable().optional(), unitCost: z.number().nonnegative().optional() });
const response = (b: any): BatchResponse => ({ ...b, unitCost: Number(b.unitCost), expirationDate: b.expirationDate?.toISOString() || null, receivedAt: b.receivedAt.toISOString() });
export async function createBatch(input: BatchInput): Promise<BatchResponse> {
    const parsed = batchSchema.safeParse(input);
    if (!parsed.success)
        throw new AppError("Datos de lote inválidos.", 400);
    const data = parsed.data;
    if (data.expirationDate && new Date(data.expirationDate) <= new Date())
        throw new AppError("No se puede ingresar un lote vencido.", 400);
    const result = await serialTransaction(async (tx) => {
        await lockProducts(tx, [data.productId]);
        const p = await tx.product.findUnique({ where: { id: data.productId } });
        if (!p || !p.active)
            throw new AppError("Producto no encontrado.", 404);
        const batch = await tx.productBatch.create({ data: { productId: p.id, code: data.code, quantity: data.quantity, expirationDate: data.expirationDate ? new Date(data.expirationDate) : null, unitCost: data.unitCost ?? p.costPrice } });
        await tx.product.update({ where: { id: p.id }, data: { stock: { increment: data.quantity } } });
        await tx.inventoryMovement.create({ data: { productId: p.id, productName: p.name, movementType: "PURCHASE", quantity: data.quantity, stockBefore: p.stock, stockAfter: p.stock + data.quantity, batchCode: data.code, reason: "Ingreso por lote" } });
        return response(batch);
    });
    emitEvent("inventory:movement_created", { productId: data.productId });
    return result;
}
export async function getBatchesByProduct(productId: string): Promise<BatchResponse[]> { return (await prisma.productBatch.findMany({ where: { productId }, orderBy: [{ receivedAt: "asc" }, { id: "asc" }] })).map(response); }
export async function getExpiringBatches(days: number): Promise<BatchResponse[]> { if (!Number.isInteger(days) || days < 0 || days > 365)
    throw new AppError("Plazo inválido.", 400); const end = new Date(); end.setDate(end.getDate() + days); return (await prisma.productBatch.findMany({ where: { expirationDate: { not: null, lte: end }, quantity: { gt: 0 } }, orderBy: { expirationDate: "asc" } })).map(response); }
export async function consumeFromBatches(productId: string, quantity: number, tx: Prisma.TransactionClient, specificCode?: string, includeExpired = false): Promise<{
    batchCode: string;
    quantity: number;
    unitCost: string;
}[]> {
    const product = await tx.product.findUniqueOrThrow({ where: { id: productId } });
    const all = await tx.productBatch.findMany({ where: { productId, quantity: { gt: 0 } }, orderBy: [{ receivedAt: "asc" }, { id: "asc" }] });
    const unbatched = product.stock - all.reduce((s, b) => s + b.quantity, 0);
    if (unbatched < 0)
        throw new AppError("El stock general no coincide con los lotes. Requiere conciliación.", 409);
    const eligible = all.filter(b => (!specificCode || b.code === specificCode) && (includeExpired || !b.expirationDate || b.expirationDate > new Date()));
    let remaining = quantity;
    const consumed = [];
    for (const batch of eligible) {
        if (remaining <= 0)
            break;
        const take = Math.min(remaining, batch.quantity);
        await tx.productBatch.update({ where: { id: batch.id }, data: { quantity: { decrement: take } } });
        consumed.push({ batchCode: batch.code, quantity: take, unitCost: batch.unitCost.toString() });
        remaining -= take;
    }
    if (remaining > (specificCode ? 0 : unbatched))
        throw new AppError("Stock insuficiente en lotes disponibles o producto vencido.", 409);
    return consumed;
}
