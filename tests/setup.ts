import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll, beforeEach } from 'vitest';
import { execFileSync } from 'node:child_process';
const url = process.env.TEST_DATABASE_URL;
if (!url)
    throw new Error('TEST_DATABASE_URL requerida: usa una base de pruebas separada.');
const name = new URL(url).pathname.slice(1);
if (!/^gestor_huaskar_test(?:_[a-zA-Z0-9_]+)?$/.test(name))
    throw new Error('Se rechaza ejecutar pruebas sobre una base que no sea de test.');
process.env.DATABASE_URL = url;
process.env.JWT_SECRET = 'integration-test-secret-only';
process.env.NODE_ENV = 'test';
const prisma = new PrismaClient();
beforeAll(async () => { const cli = process.platform === 'win32' ? 'node_modules/prisma/build/index.js' : 'node_modules/prisma/build/index.js'; execFileSync(process.execPath, [cli, 'migrate', 'deploy'], { env: { ...process.env, DATABASE_URL: url }, stdio: 'inherit' }); });
afterAll(() => prisma.$disconnect());
beforeEach(async () => {
    // Only test fixtures in the explicitly guarded database are removed.
    await prisma.$transaction([
        prisma.auditLog.deleteMany(), prisma.cashMovement.deleteMany(), prisma.inventoryMovement.deleteMany(), prisma.salePayment.deleteMany(), prisma.saleItem.deleteMany(), prisma.sale.deleteMany(), prisma.productBatch.deleteMany(), prisma.purchaseOrderItem.deleteMany(), prisma.purchaseOrder.deleteMany(), prisma.cashRegisterSession.deleteMany(), prisma.product.deleteMany(), prisma.category.deleteMany(), prisma.supplier.deleteMany(), prisma.customer.deleteMany(), prisma.user.deleteMany(), prisma.receiptCounter.deleteMany()
    ]);
});
export { prisma };
