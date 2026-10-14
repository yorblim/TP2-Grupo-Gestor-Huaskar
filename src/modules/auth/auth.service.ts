import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type { LoginResponse, RegisterInput, RegisterResponse } from "./auth.types";
function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new AppError("JWT_SECRET no está configurado.", 500);
    }
    return secret;
}
function generateToken(user: {
    id: number;
    email: string;
    role: "ADMIN" | "CAJERO" | "ALMACEN";
    tokenVersion?: number;
}): string {
    return jwt.sign({ id: user.id, email: user.email, role: user.role, version: user.tokenVersion ?? 0 }, getJwtSecret(), {
        expiresIn: "24h",
    });
}
export async function loginService(email: string, password: string): Promise<LoginResponse> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        throw new AppError("Credenciales incorrectas", 401);
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
        throw new AppError("Credenciales incorrectas", 401);
    }
    const token = generateToken(user);
    return {
        success: true,
        message: "Inicio de sesión exitoso.",
        token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role as "ADMIN" | "CAJERO" | "ALMACEN",
        },
    };
}
export async function registerService(input: RegisterInput): Promise<RegisterResponse> {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
        throw new AppError("El correo ya está registrado.", 409);
    }
    const hashedPassword = await bcrypt.hash(input.password, 10);
    const user = await prisma.user.create({
        data: {
            name: input.name,
            email: input.email,
            password: hashedPassword,
            role: "CAJERO",
        },
    });
    return {
        success: true,
        message: "Usuario registrado correctamente.",
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role as "ADMIN" | "CAJERO" | "ALMACEN",
        },
    };
}
