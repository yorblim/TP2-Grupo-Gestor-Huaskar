import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import type { UserRole } from "../modules/auth/auth.types";
export async function authenticateToken(token: string) {
    const secret = process.env.JWT_SECRET;
    if (!secret)
        throw new Error("JWT_SECRET no configurado");
    const decoded = jwt.verify(token, secret, { algorithms: ["HS256"] }) as {
        id: number;
        version?: number;
        exp?: number;
    };
    if (!Number.isInteger(decoded.id))
        throw new Error("Token inválido");
    const user = await prisma.user.findUnique({ where: { id: decoded.id }, select: { id: true, email: true, name: true, role: true, tokenVersion: true } });
    if (!user || user.tokenVersion !== (decoded.version ?? 0))
        throw new Error("Sesión revocada");
    return { ...user, expiresAt: decoded.exp };
}
export async function authMiddleware(req: Request, res: Response, next: NextFunction) { if (req.user)
    return next(); const token = req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : req.cookies?.token; if (!token)
    return res.status(401).json({ success: false, message: "Token requerido." }); try {
    const user = await authenticateToken(token);
    req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    next();
}
catch {
    return res.status(401).json({ success: false, message: "Sesión inválida o expirada." });
} }
export function requireRole(...roles: UserRole[]) { return (req: Request, res: Response, next: NextFunction) => { if (!req.user || !roles.includes(req.user.role))
    return res.status(403).json({ success: false, message: "Acceso denegado." }); next(); }; }
