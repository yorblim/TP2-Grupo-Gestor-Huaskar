import { Router } from "express";
import { getAllProductsHandler, getProductByIdHandler, getProductByBarcodeHandler, createProductHandler, updateProductHandler, deleteProductHandler, } from "./product.controller";
import { authMiddleware, requireRole } from "../../middlewares/auth.middleware";
import { auditMiddleware } from "../../middlewares/audit.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { createProductSchema, updateProductSchema } from "./product.validation";
const productRouter = Router();
import { getProductSummary } from "./product.service";
productRouter.get("/summary", authMiddleware, async (_req, res, next) => {
    try { res.json({ success: true, data: await getProductSummary() }); } catch (error) { next(error); }
});
productRouter.get("/", authMiddleware, getAllProductsHandler);
productRouter.get("/barcode/:barcode", authMiddleware, getProductByBarcodeHandler);
productRouter.get("/:id", authMiddleware, getProductByIdHandler);
productRouter.post("/", authMiddleware, requireRole("ADMIN", "ALMACEN"), auditMiddleware("CREATE", "Product"), validate(createProductSchema), createProductHandler);
productRouter.put("/:id", authMiddleware, requireRole("ADMIN", "ALMACEN"), auditMiddleware("UPDATE", "Product"), validate(updateProductSchema), updateProductHandler);
productRouter.delete("/:id", authMiddleware, requireRole("ADMIN"), auditMiddleware("DELETE", "Product"), deleteProductHandler);
export default productRouter;
