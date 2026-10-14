import { Request, Response, NextFunction } from "express";
import { z } from "zod";
const loginSchema = z.object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(6),
});
const registerSchema = z.object({
    name: z.string().min(3),
    email: z.string().email(),
    password: z.string().min(6),
});
export function validateLogin(req: Request, res: Response, next: NextFunction) {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({
            success: false,
            message: "Datos inválidos.",
            errors: result.error.issues,
        });
    }
    req.body = result.data;
    next();
}
export function validateRegister(req: Request, res: Response, next: NextFunction) {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({
            success: false,
            message: "Datos inválidos.",
            errors: result.error.issues,
        });
    }
    req.body = result.data;
    next();
}
