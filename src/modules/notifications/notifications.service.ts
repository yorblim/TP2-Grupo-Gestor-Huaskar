import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { authenticateToken } from "../../middlewares/auth.middleware";
import { prisma } from "../../lib/prisma";
import type { UserRole } from "../auth/auth.types";
const clients = new Map<WebSocket, {
    userId: number;
    version: number;
    expiresAt?: number;
    role: UserRole;
    topics: Set<string>;
}>();
const permits = (role: UserRole, topic: string) => role === "ADMIN" || (role === "CAJERO" ? topic.startsWith("sale:") || topic.startsWith("cashregister:") || topic === "low_stock" : topic.startsWith("inventory:") || topic === "low_stock");
export function initWebSocket(server: Server) {
    const wss = new WebSocketServer({ server, path: "/ws", maxPayload: 16384, verifyClient: (info, done) => {
            const origin = info.origin;
            const allowed = (process.env.CORS_ORIGIN || "").split(",").map(s => s.trim());
            if (origin && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) && !allowed.includes(origin))
                return done(false, 403);
            const cookie = info.req.headers.cookie?.split(";").map(s => s.trim()).find(s => s.startsWith("token="))?.slice(6);
            const token = info.req.headers.authorization?.startsWith("Bearer ") ? info.req.headers.authorization.slice(7) : cookie;
            if (!token)
                return done(false, 401);
            authenticateToken(decodeURIComponent(token)).then(user => { (info.req as any).wsUser = user; done(true); }).catch(() => done(false, 401));
        } });
    wss.on("connection", (ws, req) => {
        const user = (req as any).wsUser;
        clients.set(ws, { userId: user.id, version: user.tokenVersion, expiresAt: user.expiresAt, role: user.role, topics: new Set(["*"]) });
        ws.on("message", raw => { try {
            const msg = JSON.parse(raw.toString());
            const client = clients.get(ws);
            if (!client || !Array.isArray(msg.topics) || msg.topics.length > 30)
                return;
            for (const topic of msg.topics) {
                if (typeof topic !== "string" || topic.length > 100)
                    continue;
                if (msg.type === "subscribe" && (topic === "*" || permits(client.role, topic)))
                    client.topics.add(topic);
                if (msg.type === "unsubscribe")
                    client.topics.delete(topic);
            }
        }
        catch { /* Invalid messages are ignored. */ } });
        ws.on("close", () => clients.delete(ws));
        ws.on("error", () => { clients.delete(ws); ws.terminate(); });
    });
    const timer = setInterval(async () => { for (const [ws, c] of clients) {
        try {
            const user = await prisma.user.findUnique({ where: { id: c.userId } });
            if (!user || user.tokenVersion !== c.version || (c.expiresAt && c.expiresAt * 1000 <= Date.now())) {
                ws.close(1008, "Sesión expirada");
                continue;
            }
            c.role = user.role;
            ws.ping();
        }
        catch {
            ws.close(1011, "Servicio no disponible");
        }
    } await checkLowStock(); }, 30000);
    timer.unref();
    wss.on("close", () => clearInterval(timer));
    void checkLowStock();
    return wss;
}
async function checkLowStock() { try {
    const products = await prisma.product.findMany({ where: { active: true }, select: { id: true, name: true, stock: true, minStock: true } });
    const low = products.filter(p => p.stock <= p.minStock);
    if (low.length)
        broadcast({ type: "low_stock", data: low, count: low.length });
}
catch { /* Retry on the next interval. */ } }
export function emitToTopic(topic: string, message: any) { const body = JSON.stringify(message); for (const [ws, c] of clients)
    if (ws.readyState === WebSocket.OPEN && permits(c.role, topic) && (c.topics.has(topic) || c.topics.has("*")))
        ws.send(body); }
export function broadcast(message: any) { emitToTopic(message.type, message); }
export function emitEvent(type: string, payload?: any) { emitToTopic(type, { type, data: payload, timestamp: new Date().toISOString() }); }
