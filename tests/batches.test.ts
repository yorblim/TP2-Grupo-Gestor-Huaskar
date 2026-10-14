import { describe, it, expect } from 'vitest';
import { prisma } from './setup';
import { createProduct } from '../src/modules/product/product.service';
import { createBatch, getBatchesByProduct, getExpiringBatches } from '../src/modules/batch/batch.service';
describe('Batches Service', () => {
    it('should create a batch and increase stock', async () => {
        const product = await createProduct({
            code: 'BATCH001',
            name: 'Producto con Lote',
            price: 25,
            stock: 0,
            minStock: 5,
        });
        const batch = await createBatch({
            productId: product.id,
            code: 'LOTE-2026-001',
            quantity: 100,
            expirationDate: new Date(Date.now() + 100 * 86400000).toISOString(),
        });
        expect(batch).toBeDefined();
        expect(batch.code).toBe('LOTE-2026-001');
        expect(batch.quantity).toBe(100);
        expect(batch.expirationDate).toBeDefined();
        const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } });
        expect(updatedProduct?.stock).toBe(100);
    });
    it('should create a batch without expiration date', async () => {
        const product = await createProduct({
            code: 'BATCH002',
            name: 'Producto sin Vencimiento',
            price: 10,
            stock: 0,
            minStock: 2,
        });
        const batch = await createBatch({
            productId: product.id,
            code: 'LOTE-NOEXP',
            quantity: 50,
        });
        expect(batch.expirationDate).toBeNull();
    });
    it('should get batches by product', async () => {
        const product = await createProduct({
            code: 'BATCH003',
            name: 'Producto Múltiples Lotes',
            price: 15,
            stock: 0,
            minStock: 3,
        });
        await createBatch({ productId: product.id, code: 'LOTE-A', quantity: 30 });
        await createBatch({ productId: product.id, code: 'LOTE-B', quantity: 20 });
        const batches = await getBatchesByProduct(product.id);
        expect(batches).toHaveLength(2);
        expect(batches.find(b => b.code === 'LOTE-A')?.quantity).toBe(30);
        expect(batches.find(b => b.code === 'LOTE-B')?.quantity).toBe(20);
    });
    it('should get expiring batches within days', async () => {
        const product = await createProduct({
            code: 'BATCH004',
            name: 'Producto Próximo a Vencer',
            price: 8,
            stock: 0,
            minStock: 2,
        });
        await createBatch({ productId: product.id, code: 'LOTE-VENCE', quantity: 10, expirationDate: new Date(Date.now() + 5 * 86400000).toISOString() });
        await createBatch({ productId: product.id, code: 'LOTE-LEJOS', quantity: 10, expirationDate: '2028-01-01' });
        const expiring = await getExpiringBatches(30);
        expect(expiring.length).toBeGreaterThanOrEqual(1);
        expect(expiring.find(b => b.code === 'LOTE-VENCE')).toBeDefined();
    });
});
