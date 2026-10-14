import { serialTransaction } from "../../lib/transaction";
import bcrypt from "bcrypt";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
export async function getAllUsers(page = 1, limit = 50, search = "") {
    const where = search
        ? { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { email: { contains: search, mode: "insensitive" as const } }] }
        : {};
    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where,
            select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { createdAt: "desc" },
        }),
        prisma.user.count({ where }),
    ]);
    return { data: users, total, page, limit, totalPages: Math.ceil(total / limit) };
}
export async function createUser(data: {
    name: string;
    email: string;
    password: string;
    role: "ADMIN" | "CAJERO" | "ALMACEN";
}) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing)
        throw new AppError("El correo ya está registrado.", 409);
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
        data: { name: data.name, email: data.email, password: hashedPassword, role: data.role },
        select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
    });
    return user;
}
export async function updateUser(id: number, data: {
    name?: string;
    email?: string;
    password?: string;
    role?: "ADMIN" | "CAJERO" | "ALMACEN";
}) {
    return serialTransaction(async (tx) => {
        const user = await tx.user.findUnique({ where: { id } });
        if (!user)
            throw new AppError("Usuario no encontrado.", 404);
        if (data.email && data.email !== user.email) {
            const existing = await tx.user.findUnique({ where: { email: data.email } });
            if (existing)
                throw new AppError("El correo ya está registrado.", 409);
        }
        const updateData: any = {};
        if (data.name)
            updateData.name = data.name;
        if (data.email)
            updateData.email = data.email;
        if (data.role && user.role === "ADMIN" && data.role !== "ADMIN" && await tx.user.count({ where: { role: "ADMIN" } }) <= 1)
            throw new AppError("No se puede cambiar el rol del único administrador.", 409);
        if (data.role)
            updateData.role = data.role;
        if (data.password) {
            updateData.password = await bcrypt.hash(data.password, 10);
            updateData.tokenVersion = { increment: 1 };
        }
        return tx.user.update({
            where: { id },
            data: updateData,
            select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
        });
    });
}
export async function deleteUser(id: number) {
    return serialTransaction(async (tx) => {
        const user = await tx.user.findUnique({ where: { id } });
        if (!user)
            throw new AppError("Usuario no encontrado.", 404);
        const adminCount = await tx.user.count({ where: { role: "ADMIN" } });
        if (user.role === "ADMIN" && adminCount <= 1) {
            throw new AppError("No se puede eliminar el único administrador.", 400);
        }
        await tx.user.delete({ where: { id } });
        return true;
    });
}
