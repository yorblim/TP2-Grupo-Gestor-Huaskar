import { prisma } from "../../lib/prisma";
import { dateRange, peruDate } from "../../utils/dates";
import { getProfitReport } from "../report/report.service";
export async function dashboardSummary() {
    const today = peruDate();
    const now = new Date(today + "T12:00:00-05:00");
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 6);
    const monthStart = today.slice(0, 7) + "-01";
    const [day, week, month, count, products, expiring, purchases, sessions, recentSales, profit] = await Promise.all([
        prisma.sale.aggregate({ where: { status: "ACTIVE", createdAt: dateRange(today, today) }, _sum: { total: true }, _count: true }),
        prisma.sale.aggregate({ where: { status: "ACTIVE", createdAt: dateRange(peruDate(weekStart), today) }, _sum: { total: true }, _count: true }),
        prisma.sale.aggregate({ where: { status: "ACTIVE", createdAt: dateRange(monthStart, today) }, _sum: { total: true }, _count: true }),
        prisma.product.count({ where: { active: true } }),
        prisma.product.findMany({ where: { active: true }, select: { id: true, name: true, stock: true, minStock: true } }),
        prisma.productBatch.findMany({ where: { quantity: { gt: 0 }, expirationDate: { gte: new Date(), lte: new Date(Date.now() + 30 * 86400000) } }, include: { product: { select: { name: true } } }, orderBy: { expirationDate: "asc" }, take: 8 }),
        prisma.purchaseOrder.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
        prisma.cashRegisterSession.findMany({ where: { status: "OPEN" }, include: { openedBy: { select: { name: true } } } }),
        prisma.sale.findMany({ where: { status: "ACTIVE", createdAt: dateRange(peruDate(weekStart), today) }, include: { items: { include: { product: { select: { name: true } } } } }, orderBy: { createdAt: "desc" } }),
        getProfitReport({ startDate: monthStart, endDate: today })
    ]);
    const daily = new Map<string, number>();
    for (let offset = 6; offset >= 0; offset--) {
        const d = new Date(now);
        d.setDate(d.getDate() - offset);
        daily.set(peruDate(d), 0);
    }
    const ranked = new Map<string, {
        name: string;
        quantity: number;
    }>();
    for (const sale of recentSales) {
        const key = peruDate(sale.createdAt);
        daily.set(key, (daily.get(key) || 0) + Number(sale.total));
        for (const i of sale.items) {
            const r = ranked.get(i.productId) || { name: i.productName || i.product.name, quantity: 0 };
            r.quantity += i.quantity;
            ranked.set(i.productId, r);
        }
    }
    return { date: today, day: { revenue: Number(day._sum.total || 0), sales: day._count }, week: { revenue: Number(week._sum.total || 0), sales: week._count }, month: { revenue: Number(month._sum.total || 0), sales: month._count }, productCount: count, lowStock: products.filter(p => p.stock <= p.minStock), expiring: expiring.map(b => ({ id: b.id, name: b.product.name, code: b.code, quantity: b.quantity, expirationDate: b.expirationDate })), recentPurchases: purchases.map(p => ({ id: p.id, supplier: p.supplierName, total: Number(p.total), status: p.status, createdAt: p.createdAt })), activeSessions: sessions.map(s => ({ id: s.id, cashier: s.openedBy.name, openedAt: s.openedAt })), daily: [...daily].map(([date, revenue]) => ({ date, revenue })), topSelling: [...ranked.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5), estimatedProfit: profit.summary.totalProfit };
}
