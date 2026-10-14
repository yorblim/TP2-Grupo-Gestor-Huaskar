import { prisma } from "../../lib/prisma";
export async function getSuggestions() {
    const products = await prisma.product.findMany({
        where: { active: true },
        include: { category: { select: { name: true } } },
        orderBy: { name: "asc" },
    });
    return products
        .filter((p) => p.stock <= p.minStock)
        .map((product) => {
        const stock = product.stock;
        const minStock = product.minStock;
        const suggested = Math.max((product.maxStock ?? minStock * 2) - stock, 0);
        return {
            productId: product.id,
            productCode: product.code,
            productName: product.name,
            currentStock: stock,
            minStock,
            suggestedQuantity: suggested,
            categoryName: product.category?.name || null,
        };
    });
}
