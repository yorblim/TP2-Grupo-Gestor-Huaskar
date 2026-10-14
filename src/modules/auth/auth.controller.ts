import { prisma } from "../../lib/prisma";
import { Request, Response, NextFunction } from "express";
import { loginService, registerService } from "./auth.service";
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 24 * 60 * 60 * 1000,
    path: "/",
};
export async function login(req: Request, res: Response, next: NextFunction) {
    try {
        const { email, password } = req.body;
        const result = await loginService(email, password);
        res.cookie("token", result.token, COOKIE_OPTIONS);
        res.status(200).json(result);
    }
    catch (error) {
        return next(error);
    }
}
export async function logout(req: Request, res: Response) {
    await prisma.user.update({ where: { id: req.user!.id }, data: { tokenVersion: { increment: 1 } } });
    res.clearCookie("token", { path: "/" });
    res.status(200).json({ success: true, message: "Sesión cerrada." });
}
export async function register(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await registerService(req.body);
        res.status(201).json(result);
    }
    catch (error) {
        return next(error);
    }
}
export function profile(req: Request, res: Response) {
    res.status(200).json({
        success: true,
        message: "Perfil obtenido correctamente.",
        user: req.user,
    });
}
export function adminPanel(req: Request, res: Response) {
    res.status(200).json({
        success: true,
        message: "Bienvenido al panel de administrador.",
        user: req.user,
    });
}
