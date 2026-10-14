import { parse } from "csv-parse/sync";
import { randomUUID } from "node:crypto";
import { prisma } from "../../lib/prisma";
import { createProductSchema } from "../product/product.validation";
import { AppError } from "../../utils/AppError";
import type { ImportResult } from "./import.types";
export async function importProductsFromCSV(fileBuffer: Buffer, actorId?: number): Promise<ImportResult> {
    let content = fileBuffer.toString("utf8").replace(/^\ufeff/, "");
    let delimiter = content.split(/\r?\n/)[0].includes(';') ? ';' : ',';
    if (/^sep=./i.test(content)) {
        delimiter = content[4];
        content = content.slice(content.indexOf('\n') + 1);
    }
    let records: Record<string, string>[];
    try {
        records = parse(content, { columns: true, skip_empty_lines: true, trim: true, delimiter });
    }
    catch {
        throw new AppError("CSV inválido.", 400);
    }
    if (records.length > 10000)
        throw new AppError("El máximo es 10000 filas por importación.", 400);
    let created = 0;
    const errors: string[] = [];
    for (const [index, row] of records.entries()) {
        const data = { code: row.code || row.Codigo || row.codigo || row["Código"] || 'IMP-' + randomUUID(), name: row.name || row.Nombre || row.nombre || row.Producto || row.producto, price: Number(row.price || row.Precio || row.precio || 0), costPrice: Number(row.costPrice || row.cost_price || row['Precio Costo'] || row.Costo || 0), stock: Number(row.stock || row.Stock || 0), minStock: Number(row.minStock || row.min_stock || row['Stock Minimo'] || row['Stock Mínimo'] || 5), barcode: row.barcode || row['Código de barras'] || undefined };
        const parsed = createProductSchema.safeParse(data);
        if (!parsed.success) {
            errors.push(`Fila ${index + 2}: ${parsed.error.issues.map(i => i.message).join('; ')}`);
            continue;
        }
        try {
            await prisma.$transaction(async (tx) => { const categoryName = row.category || row.Categoria || row.categoria || row['Categoría'] || ''; let categoryId: string | undefined; if (categoryName)
                categoryId = (await tx.category.upsert({ where: { name: categoryName }, create: { name: categoryName }, update: {} })).id; const p = await tx.product.create({ data: { ...parsed.data, categoryId } }); if (p.stock > 0) {
                const code = 'IMPORT-' + p.id;
                await tx.productBatch.create({ data: { productId: p.id, code, quantity: p.stock, unitCost: p.costPrice } });
                await tx.inventoryMovement.create({ data: { productId: p.id, productName: p.name, movementType: 'ADJUSTMENT', quantity: p.stock, stockBefore: 0, stockAfter: p.stock, batchCode: code, reason: 'Importación de stock inicial' } });
            } if (actorId) {
                const actor = await tx.user.findUniqueOrThrow({ where: { id: actorId } });
                await tx.auditLog.create({ data: { userId: actor.id, userName: actor.email, action: 'IMPORT', entity: 'Product', entityId: p.id } });
            } });
            created++;
        }
        catch {
            errors.push(`Fila ${index + 2}: registro duplicado o datos incompatibles.`);
        }
    }
    return { created, errors: errors.slice(0, 20), totalErrors: errors.length };
}
