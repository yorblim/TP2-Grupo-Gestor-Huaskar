import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { AppError } from "../utils/AppError";
export function errorMiddleware(err: Error, _req: Request, res: Response, _next: NextFunction) {
    if (err instanceof AppError)
        return res.status(err.statusCode).json({ success: false, message: err.message });
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        const code = err.code;
        const status = code === "P2002" || code === "P2003" || code === "P2034" ? 409 : code === "P2025" ? 404 : 500;
        return res.status(status).json({ success: false, message: code === "P2002" ? "El registro ya existe." : code === "P2003" ? "El registro tiene referencias asociadas." : code === "P2025" ? "Registro no encontrado." : code === "P2034" ? "Conflicto concurrente. Vuelve a intentar." : "Error de base de datos." });
    }
    if (err.message === "Origen no permitido por CORS.")
        return res.status(403).json({ success: false, message: err.message });
    const e = err as Error & {
        status?: number;
    };
    if (e.status === 400)
        return res.status(400).json({ success: false, message: "Solicitud inválida." });
    console.error("Error interno:", err.name);
    return res.status(500).json({ success: false, message: "Error interno del servidor." });
}
