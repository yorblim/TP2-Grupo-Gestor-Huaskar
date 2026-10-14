import { Request, Response, NextFunction } from "express";
import { importProductsFromCSV } from "./import.service";
export async function importProductsHandler(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.file) {
            res.status(400).json({ success: false, message: "Archivo requerido" });
            return;
        }
        const result = await importProductsFromCSV(req.file.buffer, req.user!.id);
        res.json({
            success: true,
            data: result,
            message: `${result.created} productos importados${result.errors.length ? `, ${result.totalErrors} errores` : ""}`,
        });
    }
    catch (error) {
        next(error);
    }
}
