import { Request, Response, NextFunction } from "express";
import { z } from "zod";
const createUserSchema = z.object({
    name: z.string().min(3, "Nombre debe tener al menos 3 caracteres"),
    email: z.string().trim().toLowerCase().email("Correo inválido"),
    password: z.string().min(6, "Contraseña debe tener al menos 6 caracteres"),
    role: z.enum(["ADMIN", "CAJERO", "ALMACEN"]),
});
const updateUserSchema = z.object({
    name: z.string().min(3).optional(),
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
    role: z.enum(["ADMIN", "CAJERO", "ALMACEN"]).optional(),
});
export function validateCreateUser(req: Request, res: Response, next: NextFunction) {
    const result = createUserSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ success: false, message: "Datos inválidos.", errors: result.error.issues });
    }
    req.body = result.data;
    next();
}
export function validateUpdateUser(req: Request, res: Response, next: NextFunction) {
    const result = updateUserSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ success: false, message: "Datos inválidos.", errors: result.error.issues });
    }
    req.body = result.data;
    next();
}
