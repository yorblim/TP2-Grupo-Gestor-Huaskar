import { createProductSchema } from "./product.validation";
import { CreateProductInput, UpdateProductInput, ProductResponse } from "./product.types";
import { prisma } from "../../lib/prisma";
import { emitEvent } from "../notifications/notifications.service";
export async function getProductSummary() {
    const [summary] = await prisma.$queryRaw<Array<{ count: bigint; lowStock: bigint; retailValue: string; costValue: string }>>`
      SELECT COUNT(*) AS "count", COUNT(*) FILTER (WHERE stock <= "minStock") AS "lowStock",
      COALESCE(SUM(stock * price), 0)::text AS "retailValue",
      COALESCE(SUM(stock * "costPrice"), 0)::text AS "costValue"
      FROM "Product" WHERE active = true`;
    return { count: Number(summary.count), lowStock: Number(summary.lowStock), retailValue: Number(summary.retailValue), costValue: Number(summary.costValue) };
}
import { AppError } from "../../utils/AppError";
import { getPaginationParams, paginatedResult, type PaginatedResult } from "../../utils/pagination";
function toProductResponse(product: any): ProductResponse {
    const price = parseFloat(product.price.toString());
    const costPrice = parseFloat(product.costPrice?.toString() || "0");
    const margin = costPrice > 0 ? ((price - costPrice) / price) * 100 : 0;
    return {
        id: product.id, active: product.active, maxStock: product.maxStock,
        code: product.code,
        barcode: product.barcode || null,
        name: product.name,
        price,
        costPrice,
        stock: product.stock,
        minStock: product.minStock,
        imageUrl: product.imageUrl,
        categoryId: product.categoryId,
        categoryName: product.category?.name || null,
        createdAt: product.createdAt.toISOString(),
        isLowStock: product.stock <= product.minStock,
        margin: Math.round(margin * 100) / 100,
    };
}
export async function getAllProducts(query: Record<string, any> = {}): Promise<PaginatedResult<ProductResponse>> {
    const params = getPaginationParams(query);
    const where = params.search
        ? {
            OR: [
                { name: { contains: params.search, mode: "insensitive" as const } },
                { code: { contains: params.search, mode: "insensitive" as const } },
                { barcode: { contains: params.search, mode: "insensitive" as const } },
            ],
        }
        : {};
    if (query.active !== "all")
        Object.assign(where, { active: true });
    const [products, total] = await Promise.all([
        prisma.product.findMany({
            where,
            orderBy: { code: "asc" },
            include: { category: { select: { name: true } } },
            skip: (params.page - 1) * params.limit,
            take: params.limit,
        }),
        prisma.product.count({ where }),
    ]);
    return paginatedResult(products.map(toProductResponse), total, params);
}
export async function getProductById(id: string): Promise<ProductResponse | null> {
    const product = await prisma.product.findUnique({
        where: { id },
        include: { category: { select: { name: true } } },
    });
    return product ? toProductResponse(product) : null;
}
export async function createProduct(data: CreateProductInput): Promise<ProductResponse> {
    const parsed = createProductSchema.safeParse({ ...data, costPrice: data.costPrice ?? 0 });
    if (!parsed.success)
        throw new AppError("Datos de producto inválidos.", 400);
    if (data.maxStock != null && data.maxStock < data.minStock)
        throw new AppError("El stock máximo debe ser mayor o igual al mínimo.", 400);
    const product = await prisma.$transaction(async (tx) => {
        const created = await tx.product.create({
            data: {
                code: data.code,
                barcode: data.barcode || null,
                name: data.name,
                price: data.price,
                costPrice: data.costPrice,
                stock: data.stock,
                minStock: data.minStock, maxStock: data.maxStock,
                categoryId: data.categoryId || null,
                imageUrl: data.imageUrl || null,
            },
            include: { category: { select: { name: true } } },
        });
        if (created.stock > 0) {
            const code = "INITIAL-" + created.id;
            await tx.productBatch.create({ data: { productId: created.id, code, quantity: created.stock, unitCost: created.costPrice } });
            await tx.inventoryMovement.create({ data: { productId: created.id, productName: created.name, movementType: "ADJUSTMENT", quantity: created.stock, stockBefore: 0, stockAfter: created.stock, batchCode: code, reason: "Existencia inicial" } });
        }
        return created;
    });
    emitEvent("product:created", { productId: product.id });
    return toProductResponse(product);
}
export async function updateProduct(id: string, data: UpdateProductInput): Promise<ProductResponse> {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError("Producto no encontrado.", 404);
    }
    if (data.maxStock != null && data.maxStock < (data.minStock ?? existing.minStock))
        throw new AppError("El máximo no puede ser menor al mínimo.", 400);
    const effectiveMaximum = data.maxStock === undefined ? existing.maxStock : data.maxStock;
    if (data.minStock !== undefined && effectiveMaximum != null && data.minStock > effectiveMaximum)
        throw new AppError("El mínimo supera el máximo configurado.", 400);
    const { stock: _stock, ...safeData } = data;
    const product = await prisma.product.update({
        where: { id },
        data: safeData,
        include: { category: { select: { name: true } } },
    });
    emitEvent("product:updated", { productId: product.id });
    return toProductResponse(product);
}
export async function getProductByBarcode(barcode: string): Promise<ProductResponse | null> {
    const product = await prisma.product.findUnique({
        where: { barcode },
        include: { category: { select: { name: true } } },
    });
    return product ? toProductResponse(product) : null;
}
export async function deleteProduct(id: string): Promise<boolean> {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError("Producto no encontrado o tiene registros asociados.", 404);
    }
    await prisma.product.update({ where: { id }, data: { active: false } });
    emitEvent("product:updated", { productId: id });
    return true;
}
