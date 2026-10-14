import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import http from 'node:http';
import app from '../src/app';
import jwt from 'jsonwebtoken';
import { createProduct } from '../src/modules/product/product.service';
import { testCashier } from './helpers';
import { prisma } from './setup';
import { WebSocket } from 'ws';
import { initWebSocket } from '../src/modules/notifications/notifications.service';
import { createSale } from '../src/modules/sale/sale.service';
const server = http.createServer(app);
let base = '';
let wss: ReturnType<typeof initWebSocket>;
beforeAll(async () => { wss = initWebSocket(server); await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve)); base = 'http://127.0.0.1:' + (server.address() as any).port; });
afterAll(async () => { for (const client of wss.clients)
    client.terminate(); await new Promise<void>(resolve => wss.close(() => resolve())); await new Promise<void>(resolve => server.close(() => resolve())); });
async function token() { return jwt.sign({ id: await testCashier(), version: 0 }, process.env.JWT_SECRET!); }
describe('HTTP and websocket security', () => {
    it('notifies warehouse of stock changes after a sale without exposing sales or payments', async () => {
        const cashierId = await testCashier();
        const warehouse = await prisma.user.create({ data: { name: 'Almacén prueba', email: 'warehouse-events@test.local', password: 'test-only-hash', role: 'ALMACEN' } });
        const product = await createProduct({ code: 'WS-STOCK', name: 'Stock compartido', price: 10, costPrice: 5, stock: 3, minStock: 1 });
        const auth = jwt.sign({ id: warehouse.id, version: 0 }, process.env.JWT_SECRET!);
        const events: Array<{ type: string; data: unknown }> = [];
        const ws = await new Promise<WebSocket>((resolve, reject) => {
            const socket = new WebSocket(base.replace('http:', 'ws:') + '/ws', { headers: { Authorization: 'Bearer ' + auth, Origin: 'http://localhost' } });
            socket.on('message', raw => events.push(JSON.parse(raw.toString())));
            socket.on('open', () => resolve(socket)); socket.on('error', reject);
        });
        try {
            await createSale({ receiptType: 'boleta', paymentMethod: 'cash', items: [{ productId: product.id, quantity: 1 }] }, cashierId);
            await vi.waitFor(() => expect(events.some(e => e.type === 'inventory:movement_created')).toBe(true));
            expect(events.find(e => e.type === 'inventory:movement_created')!.data).toEqual({ productIds: [product.id] });
            expect(events.some(e => e.type.startsWith('sale:') || e.type.startsWith('cashregister:'))).toBe(false);
        } finally { await new Promise<void>(resolve => { ws.on('close', () => resolve()); ws.close(); }); }
    });
    it('permits negative stock adjustments through the validated API', async () => { const id = await testCashier(); await prisma.user.update({ where: { id }, data: { role: 'ALMACEN' } }); const p = await createProduct({ code: 'API-ADJ', name: 'Ajuste API', price: 10, costPrice: 5, stock: 3, minStock: 1 }); const headers = { Authorization: 'Bearer ' + jwt.sign({ id, version: 0 }, process.env.JWT_SECRET!), 'Content-Type': 'application/json' }; const r = await fetch(base + '/api/inventory', { method: 'POST', headers, body: JSON.stringify({ productId: p.id, movementType: 'adjustment', quantity: -1, reason: 'Corrección comprobada' }) }); expect(r.status).toBe(201); expect((await prisma.product.findUniqueOrThrow({ where: { id: p.id } })).stock).toBe(2); });
    it('protects users and rejects inventory modification by cashier', async () => { const headers = { Authorization: 'Bearer ' + await token(), 'Content-Type': 'application/json' }; expect((await fetch(base + '/api/auth/users', { headers })).status).toBe(403); expect((await fetch(base + '/api/products', { method: 'POST', headers, body: '{}' })).status).toBe(403); expect((await fetch(base + '/api/auth/profile', { headers })).status).toBe(200); });
    it('allows localhost origin and rejects an unknown origin', async () => { const headers = { Authorization: 'Bearer ' + await token(), Origin: 'http://localhost' }; const r = await fetch(base + '/api/products', { headers }); expect(r.status).toBe(200); expect(r.headers.get('access-control-allow-origin')).toBe('http://localhost'); expect((await fetch(base + '/api/products', { headers: { ...headers, Origin: 'https://unknown.example' } })).status).toBe(403); });
    it('does not expose raw database details', async () => { const id = await testCashier(); await prisma.user.update({ where: { id }, data: { role: 'ADMIN' } }); const headers = { Authorization: 'Bearer ' + jwt.sign({ id, version: 0 }, process.env.JWT_SECRET!), 'Content-Type': 'application/json' }; const first = await fetch(base + '/api/categories', { method: 'POST', headers, body: JSON.stringify({ name: 'Duplicate' }) }); expect(first.status).toBe(201); const r = await fetch(base + '/api/categories', { method: 'POST', headers, body: JSON.stringify({ name: 'Duplicate' }) }); expect(r.status).toBe(409); expect((await r.json()).message).toBe('El registro ya existe.'); });
    it('rejects websocket connections without authentication', async () => { const status = await new Promise<number>((resolve, reject) => { const ws = new WebSocket(base.replace('http:', 'ws:') + '/ws'); ws.on('unexpected-response', (_req, res) => { resolve(res.statusCode!); res.resume(); ws.terminate(); }); ws.on('error', () => { }); setTimeout(() => reject(new Error('Timeout websocket rejection')), 2000).unref(); }); expect(status).toBe(401); });
    it('accepts an authenticated websocket and cleans it up', async () => { const auth = await token(); const ws = await new Promise<WebSocket>((resolve, reject) => { const c = new WebSocket(base.replace('http:', 'ws:') + '/ws', { headers: { Authorization: 'Bearer ' + auth, Origin: 'http://localhost' } }); c.on('open', () => resolve(c)); c.on('error', reject); }); expect(ws.readyState).toBe(WebSocket.OPEN); await new Promise<void>(resolve => { ws.on('close', () => resolve()); ws.close(); }); await vi.waitFor(() => expect(wss.clients.size).toBe(0)); });
});
