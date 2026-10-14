import { Router } from "express";
import authRouter from "../modules/auth/auth.routes";
import productRouter from "../modules/product/product.routes";
import saleRouter from "../modules/sale/sale.routes";
import customerRouter from "../modules/customer/customer.routes";
import inventoryRouter from "../modules/inventory/inventory.routes";
import supplierRouter from "../modules/supplier/supplier.routes";
import purchaseRouter from "../modules/purchase/purchase.routes";
import reportRouter from "../modules/report/report.routes";
import auditRouter from "../modules/audit/audit.routes";
import categoryRouter from "../modules/category/category.routes";
import uploadRouter from "../modules/upload/upload.routes";
import printRouter from "../modules/print/print.routes";
import pdfRouter from "../modules/pdf/pdf.routes";
import importRouter from "../modules/import/import.routes";
import batchRouter from "../modules/batch/batch.routes";
import cashregisterRouter from "../modules/cashregister/cashregister.routes";
import purchaseSuggestionRouter from "../modules/purchasesuggestion/purchasesuggestion.routes";
import { authMiddleware, requireRole } from "../middlewares/auth.middleware";
const router = Router();
router.get("/", (_req, res) => {
    res.status(200).json({
        success: true,
        message: "API de Gestor Huaskar v1.0",
    });
});
router.get("/ping", (_req, res) => {
    res.status(200).json({
        success: true,
        message: "ping ok",
    });
});
router.use("/auth", authRouter);
router.use("/products", productRouter);
router.use("/categories", categoryRouter);
router.use("/sales", authMiddleware, requireRole("ADMIN", "CAJERO"), saleRouter);
router.use("/customers", authMiddleware, requireRole("ADMIN", "CAJERO"), customerRouter);
router.use("/inventory", authMiddleware, requireRole("ADMIN", "ALMACEN"), inventoryRouter);
router.use("/suppliers", authMiddleware, requireRole("ADMIN", "ALMACEN"), supplierRouter);
router.use("/purchases", authMiddleware, requireRole("ADMIN", "ALMACEN"), purchaseRouter);
router.use("/reports", authMiddleware, requireRole("ADMIN"), reportRouter);
router.use("/audit-logs", authMiddleware, requireRole("ADMIN"), auditRouter);
router.use("/uploads", authMiddleware, requireRole("ADMIN", "ALMACEN"), uploadRouter);
router.use("/print", authMiddleware, requireRole("ADMIN", "CAJERO"), printRouter);
router.use("/pdf", authMiddleware, requireRole("ADMIN", "CAJERO"), pdfRouter);
router.use("/import", authMiddleware, requireRole("ADMIN", "ALMACEN"), importRouter);
router.use("/batches", authMiddleware, requireRole("ADMIN", "ALMACEN"), batchRouter);
router.use("/cash-register", authMiddleware, requireRole("ADMIN", "CAJERO"), cashregisterRouter);
router.use("/purchase-suggestions", authMiddleware, requireRole("ADMIN", "ALMACEN"), purchaseSuggestionRouter);
export default router;
