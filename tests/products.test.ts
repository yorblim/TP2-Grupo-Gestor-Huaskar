/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import { prisma } from './setup';
import { createProduct, getProductById, getAllProducts, updateProduct, deleteProduct } from '../src/modules/product/product.service';
describe('Products Service', () => {
    it('should create a product', async () => {
        const product = await createProduct({
            code: 'TEST001',
            name: 'Producto Test',
            price: 10.50,
            stock: 100,
            minStock: 10,
        });
        expect(product).toBeDefined();
        expect(product.code).toBe('TEST001');
        expect(product.name).toBe('Producto Test');
        expect(product.price).toBe(10.50);
        expect(product.stock).toBe(100);
        expect(product.isLowStock).toBe(false);
    });
    it('should get a product by id', async () => {
        const created = await createProduct({
            code: 'TEST002',
            name: 'Producto Test 2',
            price: 15.00,
            stock: 50,
            minStock: 20,
        });
        const found = await getProductById(created.id);
        expect(found).toBeDefined();
        expect(found?.id).toBe(created.id);
        expect(found?.code).toBe('TEST002');
    });
    it('should get all products', async () => {
        await createProduct({
            code: 'TEST003',
            name: 'Producto Test 3',
            price: 20.00,
            stock: 30,
            minStock: 5,
        });
        const result = await getAllProducts();
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.data.length).toBeGreaterThan(0);
        expect(result.total).toBeGreaterThan(0);
    });
    it('should update a product', async () => {
        const created = await createProduct({
            code: 'TEST004',
            name: 'Producto Test 4',
            price: 25.00,
            stock: 40,
            minStock: 10,
        });
        const updated = await updateProduct(created.id, {
            price: 30.00,
        });
        expect(updated).toBeDefined();
        expect(updated?.price).toBe(30.00);
        expect(updated?.stock).toBe(40);
    });
    it('should deactivate a product and preserve its history', async () => {
        const created = await createProduct({
            code: 'TEST005',
            name: 'Producto Test 5',
            price: 35.00,
            stock: 60,
            minStock: 15,
        });
        const deleted = await deleteProduct(created.id);
        expect(deleted).toBe(true);
        const found = await getProductById(created.id);
        expect(found?.active).toBe(false);
    });
});
