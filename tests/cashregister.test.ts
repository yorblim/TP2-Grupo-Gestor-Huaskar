import { describe, it, expect } from 'vitest';
import { prisma } from './setup';
import { openSession, closeSession, getActiveSession, getSessions } from '../src/modules/cashregister/cashregister.service';
import bcrypt from 'bcrypt';

async function createTestUser() {
  const hashed = await bcrypt.hash('test123', 10);
  return prisma.user.create({
    data: {
      name: 'Cajero Test',
      email: 'cajero@test.com',
      password: hashed,
      role: 'ADMIN',
    },
  });
}

describe('Cash Register Service', () => {
  it('should open a session', async () => {
    const user = await createTestUser();

    const session = await openSession(user.id, { openingAmount: 500, notes: 'Apertura test' });

    expect(session).toBeDefined();
    expect(session.status).toBe('open');
    expect(parseFloat(session.openingAmount.toString())).toBe(500);
    expect(session.notes).toBe('Apertura test');
  });

  it('should close a session', async () => {
    const user = await createTestUser();
    const session = await openSession(user.id, { openingAmount: 500 });

    const closed = await closeSession(session.id, user.id, { closingAmount: 450, notes: 'Cierre test' });

    expect(closed.status).toBe('closed');
    expect(closed.closedAt).toBeDefined();
    expect(closed.closedById).toBe(user.id);
    expect(parseFloat(closed.closingAmount!.toString())).toBe(450);
    expect(closed.difference).toBeDefined();
  });

  it('closes an empty zero-balance session with a correct zero difference', async () => {
    const user = await createTestUser();
    const session = await openSession(user.id, { openingAmount: 0 });
    const closed = await closeSession(session.id, user.id, { closingAmount: 0 });
    expect(closed.status).toBe('closed');
    expect(Number(closed.expectedAmount)).toBe(0);
    expect(Number(closed.difference)).toBe(0);
  });
  it('should get active session', async () => {
    const user = await createTestUser();
    await openSession(user.id, { openingAmount: 1000 });

    const active = await getActiveSession();

    expect(active).toBeDefined();
    expect(active!.status).toBe('open');
    expect(parseFloat(active!.openingAmount.toString())).toBe(1000);
  });

  it('should return null when no active session', async () => {
    const active = await getActiveSession();
    expect(active).toBeNull();
  });

  it('should get paginated sessions', async () => {
    const user = await createTestUser();
    const session = await openSession(user.id, { openingAmount: 200 });
    await closeSession(session.id, user.id, { closingAmount: 200 });

    const result = await getSessions({});

    expect(Array.isArray(result.data)).toBe(true);
    expect(result.total).toBeGreaterThanOrEqual(1);
  });
});
