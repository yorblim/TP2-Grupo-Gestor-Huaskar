import { Router } from "express";
import multer from "multer";
import path from "path";
import { mkdirSync } from "node:fs";
mkdirSync(path.join(__dirname, "../../../uploads"), { recursive: true });
import { authMiddleware } from "../../middlewares/auth.middleware";
import { uploadProductImageHandler, deleteProductImageHandler } from "./upload.controller";
const storage = multer.diskStorage({
    destination: path.join(__dirname, "../../../uploads"),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = /\.(jpg|jpeg|png|webp)$/i;
        if (!allowed.test(path.extname(file.originalname))) {
            return cb(new Error("Solo imágenes JPG/PNG/WEBP"));
        }
        cb(null, true);
    },
});
const router = Router();
router.post("/product/:id", authMiddleware, upload.single("image"), uploadProductImageHandler);
router.delete("/product/:id", authMiddleware, deleteProductImageHandler);
export { upload };
export default router;
