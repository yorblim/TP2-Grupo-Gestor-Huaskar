import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { serialTransaction, lockCash } from "../../lib/transaction";
import { AppError } from "../../utils/AppError";
import { dateRange } from "../../utils/dates";
import { money } from "../../utils/money";
import { getPaginationParams, paginatedResult } from "../../utils/pagination";
import { emitEvent } from "../notifications/notifications.service";
import { OpenSessionInput, CloseSessionInput, SessionResponse } from "./cashregister.types";
import { openSessionSchema, closeSessionSchema } from "./cashregister.validation";
const response = (s: any): SessionResponse => ({ ...s, status: s.status.toLowerCase(), openingAmount: Number(s.openingAmount), closingAmount: s.closingAmount === null ? null : Number(s.closingAmount), expectedAmount: s.expectedAmount === null ? null : Number(s.expectedAmount), difference: s.difference === null ? null : Number(s.difference), openedBy: s.openedBy?.name || String(s.openedById), openedAt: s.openedAt.toISOString(), closedAt: s.closedAt?.toISOString() || null });
async function authorize(tx: any, userId: number, ownerId?: number) { const u = await tx.user.findUnique({ where: { id: userId } }); if (!u || !["ADMIN", "CAJERO"].includes(u.role))
    throw new AppError("Usuario no autorizado para caja.", 403); if (ownerId && u.id !== ownerId && u.role !== "ADMIN")
    throw new AppError("No puedes operar la caja de otro usuario.", 403); return u; }
async function totals(tx: any, sessionId: string, opening: any) { const payments = await tx.salePayment.findMany({ where: { method: "CASH", sale: { cashSessionId: sessionId, status: "ACTIVE" } } }); const movements = await tx.cashMovement.findMany({ where: { sessionId } }); return money(opening).plus(payments.reduce((s: any, p: any) => s.plus(p.amount), money(0))).plus(movements.reduce((s: any, m: any) => m.kind === "INCOME" ? s.plus(m.amount) : s.minus(m.amount), money(0))); }
export async function openSession(userId: number, input: OpenSessionInput): Promise<SessionResponse> {
    const parsed = openSessionSchema.safeParse(input);
    if (!parsed.success)
        throw new AppError("Monto inicial inválido.", 400);
    const data = parsed.data;
    const s = await serialTransaction(async (tx) => { await lockCash(tx); const user = await authorize(tx, userId); if (await tx.cashRegisterSession.findFirst({ where: { openedById: userId, status: "OPEN" } }))
        throw new AppError("Ya tienes una caja abierta. Ciérrala antes de abrir otra.", 409); const session = await tx.cashRegisterSession.create({ data: { openedById: userId, openingAmount: money(data.openingAmount), notes: data.notes }, include: { openedBy: true } }); await tx.auditLog.create({ data: { userId, userName: user.email, action: "OPEN", entity: "CashRegister", entityId: session.id } }); return session; });
    const result = response(s);
    emitEvent("cashregister:session_opened", result);
    return result;
}
export async function closeSession(id: string, userId: number, input: CloseSessionInput): Promise<SessionResponse> {
    const parsed = closeSessionSchema.safeParse(input);
    if (!parsed.success)
        throw new AppError("Monto de cierre inválido.", 400);
    const data = parsed.data;
    const s = await serialTransaction(async (tx) => { await lockCash(tx); const session = await tx.cashRegisterSession.findUnique({ where: { id } }); if (!session)
        throw new AppError("Sesión no encontrada.", 404); const user = await authorize(tx, userId, session.openedById); if (session.status !== "OPEN")
        throw new AppError("La sesión ya está cerrada.", 409); const expected = await totals(tx, id, session.openingAmount); const closed = await tx.cashRegisterSession.update({ where: { id }, data: { status: "CLOSED", closedAt: new Date(), closedById: userId, closingAmount: money(data.closingAmount), expectedAmount: expected, difference: money(data.closingAmount).minus(expected), notes: data.notes ?? session.notes }, include: { openedBy: true } }); await tx.auditLog.create({ data: { userId, userName: user.email, action: "CLOSE", entity: "CashRegister", entityId: id } }); return closed; });
    const result = response(s);
    emitEvent("cashregister:session_closed", result);
    return result;
}
export async function getActiveSession(userId?: number): Promise<SessionResponse | null> { const s = await prisma.cashRegisterSession.findFirst({ where: { status: "OPEN", ...(userId && { openedById: userId }) }, orderBy: { openedAt: "desc" }, include: { openedBy: true } }); if (!s)
    return null; return response({ ...s, expectedAmount: await totals(prisma, s.id, s.openingAmount) }); }
export async function getSessions(query: Record<string, any> = {}, userId?: number) { const p = getPaginationParams(query); const where = { ...(userId ? { openedById: userId } : {}), openedAt: dateRange(query.startDate, query.endDate) }; const [sessions, total] = await Promise.all([prisma.cashRegisterSession.findMany({ where, orderBy: { openedAt: "desc" }, skip: (p.page - 1) * p.limit, take: p.limit, include: { openedBy: true } }), prisma.cashRegisterSession.count({ where })]); return paginatedResult(sessions.map(response), total, p); }
export const cashMovementSchema = z.object({ kind: z.enum(["income", "expense"]), amount: z.number().positive(), reason: z.string().trim().min(3).max(500) });
export async function addCashMovement(sessionId: string, userId: number, input: unknown) { const parsed = cashMovementSchema.safeParse(input); if (!parsed.success)
    throw new AppError("Movimiento de caja inválido.", 400); const data = parsed.data; const result = await serialTransaction(async (tx) => { await lockCash(tx); const s = await tx.cashRegisterSession.findUnique({ where: { id: sessionId } }); if (!s)
    throw new AppError("Sesión no encontrada.", 404); const user = await authorize(tx, userId, s.openedById); if (s.status !== "OPEN")
    throw new AppError("La caja está cerrada.", 409); const amount = money(data.amount); if (data.kind === "expense" && amount.gt(await totals(tx, s.id, s.openingAmount)))
    throw new AppError("Efectivo insuficiente.", 409); const m = await tx.cashMovement.create({ data: { sessionId, userId, kind: data.kind === "income" ? "INCOME" : "EXPENSE", amount, reason: data.reason } }); await tx.auditLog.create({ data: { userId, userName: user.email, action: data.kind.toUpperCase(), entity: "CashRegister", entityId: s.id } }); return { ...m, amount: Number(m.amount) }; }); emitEvent("cashregister:movement_created", result); return result; }
export async function getCashMovements(sessionId: string, userId: number) { const s = await prisma.cashRegisterSession.findUnique({ where: { id: sessionId } }); if (!s)
    throw new AppError("Sesión no encontrada.", 404); await authorize(prisma, userId, s.openedById); return (await prisma.cashMovement.findMany({ where: { sessionId }, orderBy: { createdAt: "desc" } })).map(m => ({ ...m, amount: Number(m.amount) })); }
