import { Router } from "express";
import { getAllSalesHandler, getSaleByIdHandler, createSaleHandler, cancelSaleHandler, deleteSaleHandler } from "./sale.controller";
import { authMiddleware, requireRole } from "../../middlewares/auth.middleware";
import { auditMiddleware } from "../../middlewares/audit.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { createSaleSchema } from "./sale.validation";
import { prisma } from "../../lib/prisma";
import { dateRange, peruDate } from "../../utils/dates";
const saleRouter = Router();
saleRouter.get("/summary", async (_req, res, next) => { try {
    const today = peruDate();
    const [day, total, records] = await Promise.all([prisma.sale.aggregate({ where: { status: "ACTIVE", createdAt: dateRange(today, today) }, _sum: { total: true }, _count: true }), prisma.sale.aggregate({ where: { status: "ACTIVE" }, _sum: { total: true }, _count: true }), prisma.sale.count()]);
    res.json({ success: true, data: { todayRevenue: Number(day._sum.total || 0), todaySales: day._count, totalRevenue: Number(total._sum.total || 0), totalSales: total._count, totalRecords: records } });
}
catch (e) {
    next(e);
} });
saleRouter.get("/", authMiddleware, getAllSalesHandler);
saleRouter.get("/:id", authMiddleware, getSaleByIdHandler);
saleRouter.post("/", authMiddleware, validate(createSaleSchema), createSaleHandler);
saleRouter.patch("/:id/cancel", authMiddleware, requireRole("ADMIN"), cancelSaleHandler);
saleRouter.delete("/:id", authMiddleware, requireRole("ADMIN"), auditMiddleware("DELETE", "Sale"), deleteSaleHandler);
export default saleRouter;
