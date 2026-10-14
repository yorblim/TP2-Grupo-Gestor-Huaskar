import { consumeFromBatches } from "../../src/modules/batch/batch.service";
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../src/lib/prisma';
const mockTx = {
    $queryRaw: vi.fn().mockResolvedValue([]),
    user: { findUnique: vi.fn().mockResolvedValue({ id: 1, email: "cashier@test.local", role: "CAJERO" }) },
    cashRegisterSession: { findFirst: vi.fn().mockResolvedValue({ id: "session-1", status: "OPEN" }) },
    receiptCounter: { upsert: vi.fn().mockResolvedValue({ value: 1 }) },
    auditLog: { create: vi.fn() },
    customer: { findUnique: vi.fn() },
    sale: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
    saleItem: { create: vi.fn() },
    salePayment: { create: vi.fn() },
    product: {
        findUnique: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        update: vi.fn(),
    },
    productBatch: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
    },
    inventoryMovement: {
        create: vi.fn(),
        findMany: vi.fn(),
        updateMany: vi.fn(),
    },
};
vi.mock('../../src/lib/prisma', () => ({
    prisma: {
        $transaction: vi.fn((cb: (tx: any) => any) => cb(mockTx)),
        customer: { findUnique: vi.fn() },
        product: { findUnique: vi.fn() },
        sale: {
            findUnique: vi.fn(),
            findMany: vi.fn(),
            count: vi.fn(),
        },
    },
}));
vi.mock('../../src/modules/batch/batch.service', () => ({
    consumeFromBatches: vi.fn(),
}));
const mockSaleResponse = {
    id: 'sale-1',
    receiptType: 'BOLETA',
    customerDocType: null,
    customerDocNumber: null,
    customerName: 'Cliente Test',
    customerId: null,
    items: [
        {
            productId: 'prod-1',
            quantity: 2,
            unitPrice: 100n,
            subtotal: 200n,
        },
    ],
    subtotal: 200n,
    discount: 0n,
    tax: 0n,
    total: 200n,
    paymentMethod: 'CASH',
    payments: [{ method: 'CASH', amount: 200n }],
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01'),
    cancelledAt: null,
};
const mockProductDb = {
    id: 'prod-1', active: true,
    code: 'P001',
    name: 'Producto Test',
    price: 100n,
    stock: 50,
    costPrice: 60n,
    minStock: 10,
    barcode: null,
    imageUrl: null,
    categoryId: null,
    createdAt: new Date('2026-01-01'),
};
describe('Sale Service', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        mockTx.$queryRaw.mockResolvedValue([]);
        mockTx.user.findUnique.mockResolvedValue({ id: 1, email: "cashier@test.local", role: "CAJERO" });
        mockTx.cashRegisterSession.findFirst.mockResolvedValue({ id: "session-1", status: "OPEN" });
        mockTx.receiptCounter.upsert.mockResolvedValue({ value: 1 });
        mockTx.customer.findUnique.mockImplementation(prisma.customer.findUnique);
        mockTx.product.findUnique.mockImplementation(prisma.product.findUnique);
        mockTx.product.findUniqueOrThrow.mockResolvedValue(mockProductDb);
        mockTx.sale.findUnique.mockImplementation(prisma.sale.findUnique);
        vi.mocked(prisma.$transaction).mockImplementation((cb: any) => cb(mockTx));
        vi.mocked(consumeFromBatches).mockResolvedValue([]);
        mockTx.sale.create.mockImplementation(async (args: any) => ({ ...mockSaleResponse, ...args.data, items: args.data.items.create, payments: args.data.payments.create }));
    });
    describe('createSale', () => {
        it('should create a sale successfully', async () => {
            const { createSale } = await import('../../src/modules/sale/sale.service');
            vi.mocked(prisma.product.findUnique).mockResolvedValue(mockProductDb);
            vi.mocked(mockTx.sale.findUnique).mockResolvedValue(mockSaleResponse);
            vi.mocked(mockTx.product.findUnique).mockResolvedValue(mockProductDb);
            vi.mocked(mockTx.productBatch.findFirst).mockResolvedValue(null);
            const result = await createSale({
                receiptType: 'boleta',
                customerName: 'Cliente Test',
                items: [{ productId: 'prod-1', quantity: 2 }],
                paymentMethod: 'cash',
            }, 1);
            expect(result.total).toBe(200);
            expect(result.status).toBe('active');
            expect(mockTx.sale.create).toHaveBeenCalledTimes(1);
            expect(mockTx.sale.create.mock.calls[0][0].data.items.create).toHaveLength(1);
            expect(mockTx.sale.create.mock.calls[0][0].data.payments.create).toHaveLength(1);
        });
        it('should throw error when no items', async () => {
            const { createSale } = await import('../../src/modules/sale/sale.service');
            try {
                await createSale({
                    receiptType: 'boleta',
                    items: [],
                    paymentMethod: 'cash',
                }, 1);
                expect.unreachable('Should have thrown');
            }
            catch (error: any) {
                expect(error.message).toBe('La venta debe tener al menos un producto.');
            }
        });
        it('should throw error when customer not found', async () => {
            const { createSale } = await import('../../src/modules/sale/sale.service');
            vi.mocked(prisma.customer.findUnique).mockResolvedValue(null);
            try {
                await createSale({
                    receiptType: 'boleta',
                    customerId: 'nonexistent',
                    items: [{ productId: 'prod-1', quantity: 1 }],
                    paymentMethod: 'cash',
                }, 1);
                expect.unreachable('Should have thrown');
            }
            catch (error: any) {
                expect(error.message).toBe('Cliente no encontrado.');
            }
        });
        it('should throw error when product not found', async () => {
            const { createSale } = await import('../../src/modules/sale/sale.service');
            vi.mocked(prisma.product.findUnique).mockResolvedValue(null);
            try {
                await createSale({
                    receiptType: 'boleta',
                    items: [{ productId: 'nonexistent', quantity: 1 }],
                    paymentMethod: 'cash',
                }, 1);
                expect.unreachable('Should have thrown');
            }
            catch (error: any) {
                expect(error.message).toContain('Producto no encontrado');
            }
        });
        it('should throw error when insufficient stock', async () => {
            const { createSale } = await import('../../src/modules/sale/sale.service');
            vi.mocked(prisma.product.findUnique).mockResolvedValue({ ...mockProductDb, stock: 0 });
            vi.mocked(mockTx.product.findUnique).mockResolvedValue({ ...mockProductDb, stock: 0 });
            try {
                await createSale({
                    receiptType: 'boleta',
                    items: [{ productId: 'prod-1', quantity: 1 }],
                    paymentMethod: 'cash',
                }, 1);
                expect.unreachable('Should have thrown');
            }
            catch (error: any) {
                expect(error.message).toContain('Stock insuficiente');
            }
        });
        it('should calculate tax for factura', async () => {
            const { createSale } = await import('../../src/modules/sale/sale.service');
            vi.mocked(prisma.product.findUnique).mockResolvedValue(mockProductDb);
            vi.mocked(mockTx.sale.findUnique).mockResolvedValue({
                ...mockSaleResponse,
                receiptType: 'FACTURA',
                subtotal: 200n,
                tax: 36n,
                total: 236n,
            });
            vi.mocked(mockTx.product.findUnique).mockResolvedValue(mockProductDb);
            vi.mocked(mockTx.productBatch.findFirst).mockResolvedValue(null);
            const result = await createSale({
                receiptType: 'factura',
                customerName: 'Cliente Test',
                customerDocType: 'ruc',
                customerDocNumber: '20123456789',
                items: [{ productId: 'prod-1', quantity: 2 }],
                paymentMethod: 'cash',
            }, 1);
            expect(result.tax).toBe(30.51);
            expect(result.total).toBe(200);
        });
        it('should throw when payment sum does not match total', async () => {
            const { createSale } = await import('../../src/modules/sale/sale.service');
            vi.mocked(prisma.product.findUnique).mockResolvedValue(mockProductDb);
            try {
                await createSale({
                    receiptType: 'boleta',
                    items: [{ productId: 'prod-1', quantity: 2 }],
                    paymentMethod: 'cash',
                    payments: [{ method: 'cash', amount: 100 }],
                }, 1);
                expect.unreachable('Should have thrown');
            }
            catch (error: any) {
                expect(error.message).toBe('La suma de los pagos no coincide con el total.');
            }
        });
    });
    describe('cancelSale', () => {
        it('should cancel an active sale', async () => {
            const { cancelSale } = await import('../../src/modules/sale/sale.service');
            vi.mocked(prisma.sale.findUnique).mockResolvedValue(mockSaleResponse);
            vi.mocked(mockTx.inventoryMovement.findMany).mockResolvedValue([]);
            vi.mocked(mockTx.product.findUnique).mockResolvedValue(mockProductDb);
            vi.mocked(mockTx.sale.update).mockResolvedValue({
                ...mockSaleResponse,
                status: 'CANCELLED',
                cancelledAt: new Date(),
            });
            const result = await cancelSale('sale-1');
            expect(result).not.toBeNull();
            expect(result!.status).toBe('cancelled');
            expect(mockTx.product.update).toHaveBeenCalled();
            expect(mockTx.inventoryMovement.create).toHaveBeenCalled();
        });
        it('should return null when sale not found', async () => {
            const { cancelSale } = await import('../../src/modules/sale/sale.service');
            vi.mocked(prisma.sale.findUnique).mockResolvedValue(null);
            const result = await cancelSale('nonexistent');
            expect(result).toBeNull();
        });
        it('should throw when sale is already cancelled', async () => {
            const { cancelSale } = await import('../../src/modules/sale/sale.service');
            vi.mocked(prisma.sale.findUnique).mockResolvedValue({
                ...mockSaleResponse,
                status: 'CANCELLED',
            });
            try {
                await cancelSale('sale-1');
                expect.unreachable('Should have thrown');
            }
            catch (error: any) {
                expect(error.message).toBe('La venta ya está anulada.');
            }
        });
    });
    describe('getSaleById', () => {
        it('should return sale when found', async () => {
            const { getSaleById } = await import('../../src/modules/sale/sale.service');
            vi.mocked(prisma.sale.findUnique).mockResolvedValue(mockSaleResponse);
            const result = await getSaleById('sale-1');
            expect(result).not.toBeNull();
            expect(result!.id).toBe('sale-1');
        });
        it('should return null when not found', async () => {
            const { getSaleById } = await import('../../src/modules/sale/sale.service');
            vi.mocked(prisma.sale.findUnique).mockResolvedValue(null);
            const result = await getSaleById('nonexistent');
            expect(result).toBeNull();
        });
    });
    describe('getAllSales', () => {
        it('should return paginated sales', async () => {
            const { getAllSales } = await import('../../src/modules/sale/sale.service');
            vi.mocked(prisma.sale.findMany).mockResolvedValue([mockSaleResponse]);
            vi.mocked(prisma.sale.count).mockResolvedValue(1);
            const result = await getAllSales({});
            expect(result.data).toHaveLength(1);
            expect(result.total).toBe(1);
        });
    });
    describe('deleteSale', () => {
        it('should preserve a cancelled sale for auditing', async () => {
            const { deleteSale } = await import('../../src/modules/sale/sale.service');
            vi.mocked(prisma.sale.findUnique).mockResolvedValue({
                ...mockSaleResponse,
                status: 'CANCELLED',
            });
            vi.mocked(mockTx.inventoryMovement.findMany).mockResolvedValue([]);
            await expect(deleteSale("sale-1")).rejects.toThrow("Las ventas se conservan");
            expect(mockTx.sale.delete).not.toHaveBeenCalled();
        });
        it('should reject deletion of an active sale without changing stock', async () => {
            const { deleteSale } = await import('../../src/modules/sale/sale.service');
            vi.mocked(prisma.sale.findUnique).mockResolvedValue(mockSaleResponse);
            vi.mocked(mockTx.inventoryMovement.findMany).mockResolvedValue([]);
            vi.mocked(mockTx.product.findUnique).mockResolvedValue(mockProductDb);
            await expect(deleteSale("sale-1")).rejects.toThrow("Las ventas se conservan");
            expect(mockTx.sale.delete).not.toHaveBeenCalled();
        });
        it('should reject deletion even when identifier is unknown', async () => {
            const { deleteSale } = await import('../../src/modules/sale/sale.service');
            vi.mocked(prisma.sale.findUnique).mockResolvedValue(null);
            await expect(deleteSale("sale-1")).rejects.toThrow("Las ventas se conservan");
            expect(mockTx.sale.delete).not.toHaveBeenCalled();
        });
    });
});
