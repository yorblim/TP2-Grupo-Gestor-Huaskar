import { Router } from "express";
import { reportController } from "./report.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { dashboardSummary } from "./dashboard.service";
import { reportPDF } from "./report.pdf";
const router = Router();
router.get("/export/:type.pdf", reportPDF);
router.get("/export/:type.csv", reportPDF);
router.get("/dashboard", async (_req, res, next) => { try {
    res.json({ success: true, data: await dashboardSummary() });
}
catch (e) {
    next(e);
} });
router.get("/sales", authMiddleware, reportController.sales);
router.get("/purchases", authMiddleware, reportController.purchases);
router.get("/low-stock", authMiddleware, reportController.lowStock);
router.get("/top-selling", authMiddleware, reportController.topSelling);
router.get("/profit", authMiddleware, reportController.profit);
router.get("/daily-close", authMiddleware, reportController.dailyClose);
router.get("/products/csv", authMiddleware, reportController.exportProductsCSV);
router.get("/sales/csv", authMiddleware, reportController.exportSalesCSV);
export default router;
