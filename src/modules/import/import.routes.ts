import { Router } from "express";
import multer from "multer";
import { authMiddleware, requireRole } from "../../middlewares/auth.middleware";
import { importProductsHandler } from "./import.controller";
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (!file.originalname.match(/\.(csv)$/i))
            return cb(new Error("Solo archivos CSV"));
        cb(null, true);
    },
});
const router = Router();
router.post("/products", authMiddleware, requireRole("ADMIN", "ALMACEN"), upload.single("file"), importProductsHandler);
export default router;
