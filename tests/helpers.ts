import { prisma } from './setup';
import { openSession } from '../src/modules/cashregister/cashregister.service';
export async function testCashier() { const u = await prisma.user.upsert({ where: { email: 'fixture-cashier@test.local' }, create: { email: 'fixture-cashier@test.local', name: 'Cajero Fixture', password: 'test-hash', role: 'CAJERO' }, update: {} }); if (!await prisma.cashRegisterSession.findFirst({ where: { openedById: u.id, status: 'OPEN' } }))
    await openSession(u.id, { openingAmount: 0 }); return u.id; }
