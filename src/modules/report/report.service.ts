import { dateRange, peruDate } from "../../utils/dates";
import { SalesReportResponse, PurchasesReportResponse, LowStockReportResponse, TopSellingReportResponse, ProfitReportResponse, DailyCloseResponse, ReportFilters, } from "./report.types";
import { prisma } from "../../lib/prisma";
import { generateCSV } from "../../utils/csv";
export async function getSalesReport(filters: ReportFilters): Promise<SalesReportResponse> {
    const sales = await prisma.sale.findMany({
        where: {
            status: "ACTIVE",
            createdAt: dateRange(filters.startDate, filters.endDate),
            ...(filters.customerId && { customerId: filters.customerId }),
        },
        include: {
            items: true,
        },
    });
    const items = sales.map((sale) => ({
        id: sale.id,
        date: sale.createdAt.toISOString(),
        customerName: sale.customerName || "Consumidor Final",
        total: parseFloat(sale.total.toString()),
        paymentMethod: sale.paymentMethod.toLowerCase(),
        status: sale.status.toLowerCase(),
    }));
    const totalSales = items.length;
    const totalRevenue = items.reduce((sum, item) => sum + item.total, 0);
    const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;
    return {
        items,
        summary: {
            totalSales,
            totalRevenue,
            averageTicket,
        },
    };
}
export async function getPurchasesReport(filters: ReportFilters): Promise<PurchasesReportResponse> {
    const purchases = await prisma.purchaseOrder.findMany({
        where: {
            status: "RECEIVED",
            receivedAt: dateRange(filters.startDate, filters.endDate),
            ...(filters.supplierId && { supplierId: filters.supplierId }),
        },
        include: {
            items: true,
        },
    });
    const items = purchases.map((purchase) => ({
        id: purchase.id,
        date: purchase.receivedAt?.toISOString() || purchase.createdAt.toISOString(),
        supplierName: purchase.supplierName,
        total: parseFloat(purchase.total.toString()),
        status: purchase.status.toLowerCase(),
        itemsCount: purchase.items.length,
    }));
    const totalPurchases = items.length;
    const totalAmount = items.reduce((sum, item) => sum + item.total, 0);
    return {
        items,
        summary: {
            totalPurchases,
            totalAmount,
        },
    };
}
export async function getLowStockReport(): Promise<LowStockReportResponse> {
    const products = await prisma.product.findMany();
    const lowStockProducts = products.filter((product) => product.stock <= product.minStock);
    const items = lowStockProducts.map((product) => ({
        id: product.id,
        code: product.code,
        name: product.name,
        stock: product.stock,
        minStock: product.minStock,
        price: parseFloat(product.price.toString()),
    }));
    return {
        items,
        count: items.length,
    };
}
export async function getTopSellingReport(filters: ReportFilters): Promise<TopSellingReportResponse> {
    const sales = await prisma.sale.findMany({
        where: {
            status: "ACTIVE",
            createdAt: dateRange(filters.startDate, filters.endDate),
        },
        include: {
            items: {
                include: {
                    product: true,
                },
            },
        },
    });
    let salesItems = sales.flatMap((s) => s.items);
    if (filters.productId) {
        salesItems = salesItems.filter((item) => item.productId === filters.productId);
    }
    const productSales = new Map<string, {
        productName: string;
        totalQuantity: number;
        totalRevenue: number;
    }>();
    for (const item of salesItems) {
        const existing = productSales.get(item.productId);
        const revenue = parseFloat(item.subtotal.toString());
        if (existing) {
            existing.totalQuantity += item.quantity;
            existing.totalRevenue += revenue;
        }
        else {
            productSales.set(item.productId, {
                productName: item.product.name,
                totalQuantity: item.quantity,
                totalRevenue: revenue,
            });
        }
    }
    const items = Array.from(productSales.entries())
        .map(([productId, data]) => ({
        productId,
        productName: data.productName,
        totalQuantity: data.totalQuantity,
        totalRevenue: data.totalRevenue,
    }))
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, 10);
    const totalItemsSold = items.reduce((sum, item) => sum + item.totalQuantity, 0);
    const totalRevenue = items.reduce((sum, item) => sum + item.totalRevenue, 0);
    return {
        items,
        summary: {
            totalItemsSold,
            totalRevenue,
        },
    };
}
export async function getProfitReport(filters: ReportFilters): Promise<ProfitReportResponse> {
    const sales = await prisma.sale.findMany({
        where: {
            status: "ACTIVE",
            createdAt: dateRange(filters.startDate, filters.endDate),
        },
        include: {
            items: {
                include: { product: true },
            },
        },
    });
    const productProfits = new Map<string, {
        productName: string;
        quantity: number;
        revenue: number;
        cost: number;
    }>();
    for (const sale of sales) {
        if (sale.cashierId === null)
            continue; // Historical cost is unknown; do not invent it.
        for (const item of sale.items) {
            const existing = productProfits.get(item.productId);
            const gross = parseFloat(item.subtotal.toString());
            const saleGross = Number(sale.subtotal);
            const revenue = saleGross > 0 ? gross * Number(sale.total.minus(sale.tax)) / saleGross : 0;
            const costPrice = parseFloat(item.unitCost?.toString() || "0");
            const cost = costPrice * item.quantity;
            if (existing) {
                existing.quantity += item.quantity;
                existing.revenue += revenue;
                existing.cost += cost;
            }
            else {
                productProfits.set(item.productId, {
                    productName: item.product.name,
                    quantity: item.quantity,
                    revenue,
                    cost,
                });
            }
        }
    }
    const items = Array.from(productProfits.entries())
        .map(([productId, data]) => ({
        productId,
        productName: data.productName,
        quantity: data.quantity,
        revenue: Math.round(data.revenue * 100) / 100,
        cost: Math.round(data.cost * 100) / 100,
        profit: Math.round((data.revenue - data.cost) * 100) / 100,
        margin: data.revenue > 0 ? Math.round(((data.revenue - data.cost) / data.revenue) * 10000) / 100 : 0,
    }))
        .sort((a, b) => b.profit - a.profit);
    const totalRevenue = items.reduce((s, i) => s + i.revenue, 0);
    const totalCost = items.reduce((s, i) => s + i.cost, 0);
    const totalProfit = items.reduce((s, i) => s + i.profit, 0);
    return {
        items,
        summary: {
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            totalCost: Math.round(totalCost * 100) / 100,
            totalProfit: Math.round(totalProfit * 100) / 100,
            averageMargin: totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 10000) / 100 : 0,
        },
    };
}
export async function getDailyClose(filters: ReportFilters): Promise<DailyCloseResponse> {
    const sales = await prisma.sale.findMany({
        where: {
            status: "ACTIVE",
            createdAt: dateRange(filters.startDate, filters.endDate),
        },
        include: { payments: true },
    });
    const dailyMap = new Map<string, {
        cash: number;
        card: number;
        yape: number;
        plin: number;
        total: number;
        count: number;
    }>();
    for (const sale of sales) {
        const dateKey = peruDate(sale.createdAt);
        const existing = dailyMap.get(dateKey) || { cash: 0, card: 0, yape: 0, plin: 0, total: 0, count: 0 };
        const amount = parseFloat(sale.total.toString());
        existing.total += amount;
        existing.count += 1;
        if (sale.payments && sale.payments.length > 0) {
            for (const payment of sale.payments) {
                const method = payment.method.toLowerCase();
                const paymentAmount = parseFloat(payment.amount.toString());
                if (method === "cash")
                    existing.cash += paymentAmount;
                else if (method === "card")
                    existing.card += paymentAmount;
                else if (method === "yape")
                    existing.yape += paymentAmount;
                else if (method === "plin")
                    existing.plin += paymentAmount;
            }
        }
        else {
            const method = sale.paymentMethod.toLowerCase();
            if (method === "cash")
                existing.cash += amount;
            else if (method === "card")
                existing.card += amount;
            else if (method === "yape")
                existing.yape += amount;
            else if (method === "plin")
                existing.plin += amount;
        }
        dailyMap.set(dateKey, existing);
    }
    const items = Array.from(dailyMap.entries())
        .map(([date, data]) => ({
        date,
        cash: Math.round(data.cash * 100) / 100,
        card: Math.round(data.card * 100) / 100,
        yape: Math.round(data.yape * 100) / 100,
        plin: Math.round(data.plin * 100) / 100,
        total: Math.round(data.total * 100) / 100,
        count: data.count,
    }))
        .sort((a, b) => b.date.localeCompare(a.date));
    const totalRevenue = items.reduce((s, i) => s + i.total, 0);
    const totalSales = items.reduce((s, i) => s + i.count, 0);
    const byMethod: Record<string, number> = {
        cash: Math.round(items.reduce((s, i) => s + i.cash, 0) * 100) / 100,
        card: Math.round(items.reduce((s, i) => s + i.card, 0) * 100) / 100,
        yape: Math.round(items.reduce((s, i) => s + i.yape, 0) * 100) / 100,
        plin: Math.round(items.reduce((s, i) => s + i.plin, 0) * 100) / 100,
    };
    return {
        items,
        summary: { totalRevenue: Math.round(totalRevenue * 100) / 100, totalSales, byMethod },
    };
}
export async function exportProductsCSV(): Promise<string> {
    const products = await prisma.product.findMany({
        include: { category: { select: { name: true } } },
        orderBy: { name: "asc" },
    });
    const columns = [
        "Código",
        "Nombre",
        "Categoría",
        "Precio",
        "Costo",
        "Stock",
        "Stock Mínimo",
        "Margen (%)",
        "Estado",
    ];
    const rows = products.map((product) => {
        const price = parseFloat(product.price.toString());
        const costPrice = parseFloat(product.costPrice?.toString() || "0");
        const margin = costPrice > 0 ? ((price - costPrice) / price) * 100 : 0;
        const status = product.stock <= product.minStock ? "Stock Bajo" : "Normal";
        return [
            product.code,
            product.name,
            product.category?.name || "Sin categoría",
            price.toFixed(2),
            costPrice.toFixed(2),
            product.stock,
            product.minStock,
            Math.round(margin * 100) / 100,
            status,
        ];
    });
    return generateCSV(columns, rows);
}
export async function exportSalesCSV(filters: ReportFilters): Promise<string> {
    const sales = await prisma.sale.findMany({
        where: {
            status: "ACTIVE",
            createdAt: dateRange(filters.startDate, filters.endDate),
        },
        include: { items: true },
        orderBy: { createdAt: "desc" },
    });
    const columns = [
        "ID",
        "Fecha",
        "Cliente",
        "Productos",
        "Subtotal",
        "Descuento",
        "Total",
        "Método de Pago",
        "Estado",
    ];
    const rows = sales.map((sale) => [
        sale.id,
        sale.createdAt.toISOString().split("T")[0],
        sale.customerName || "Consumidor Final",
        sale.items.reduce((sum, item) => sum + item.quantity, 0),
        parseFloat(sale.subtotal.toString()).toFixed(2),
        parseFloat(sale.discount.toString()).toFixed(2),
        parseFloat(sale.total.toString()).toFixed(2),
        { CASH: "Efectivo", CARD: "Tarjeta", YAPE: "Yape", PLIN: "Plin" }[sale.paymentMethod] || sale.paymentMethod,
        sale.status === "ACTIVE" ? "Completada" : "Anulada",
    ]);
    return generateCSV(columns, rows);
}
