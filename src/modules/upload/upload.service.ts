import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { AppError } from "../../utils/AppError";
import { prisma } from "../../lib/prisma";
import type { UploadResponse } from "./upload.types";
export async function uploadProductImage(productId: string, filename: string): Promise<UploadResponse> {
    const directory = path.resolve(__dirname, "../../../uploads");
    if (path.basename(filename) !== filename)
        throw new AppError("Archivo inválido.", 400);
    const source = path.join(directory, filename);
    await mkdir(directory, { recursive: true });
    const clean = filename + ".png";
    try {
        await sharp(source, { limitInputPixels: 16000000 }).rotate().resize(1200, 1200, { fit: "inside", withoutEnlargement: true }).png().toFile(path.join(directory, clean));
    }
    catch {
        await unlink(source).catch(() => { });
        throw new AppError("La imagen no es válida.", 400);
    }
    await unlink(source);
    const imageUrl = `/uploads/${clean}`;
    const product = await prisma.product.update({
        where: { id: productId },
        data: { imageUrl },
    });
    return { imageUrl, id: product.id };
}
export async function deleteProductImage(productId: string): Promise<void> {
    await prisma.product.update({
        where: { id: productId },
        data: { imageUrl: null },
    });
}
