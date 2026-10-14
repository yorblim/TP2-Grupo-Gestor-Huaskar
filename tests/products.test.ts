/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import { prisma } from './setup';
import { createProduct, getProductById, getAllProducts, updateProduct, deleteProduct, getProductSummary } from '../src/modules/product/product.service';
describe('Products Service', () => {
    it('clears an assigned category without affecting stock or its movement history', async () => {
        const category = await prisma.category.create({ data: { name: 'Categoría removible' } });
        const product = await createProduct({ code: 'CAT-NULL', name: 'Producto categorizado', price: 5, costPrice: 2, stock: 10, minStock: 2, categoryId: category.id });
        const updated = await updateProduct(product.id, { categoryId: null });
        expect(updated!.categoryId).toBeNull(); expect(updated!.stock).toBe(10);
        expect(await prisma.inventoryMovement.count({ where: { productId: product.id } })).toBe(1);
    });
    it('allows clearing a maximum stock limit while raising the minimum', async () => {
        const product = await createProduct({ code: 'MAX-NULL', name: 'Límite opcional', price: 5, costPrice: 2, stock: 0, minStock: 2, maxStock: 10 });
        const updated = await updateProduct(product.id, { minStock: 20, maxStock: null });
        expect(updated!.maxStock).toBeNull();
        expect(updated!.minStock).toBe(20);
    });
    it('summarizes the entire active catalog independent of pagination and excludes archived products', async () => {
        for (let i = 0; i < 22; i++) await createProduct({ code: `SUM-${i}`, name: 'Producto resumen', price: 5, costPrice: 2, stock: i === 21 ? 1 : 10, minStock: 2 });
        const archived = await createProduct({ code: 'ARCHIVED', name: 'Archivado', price: 100, costPrice: 50, stock: 100, minStock: 1 });
        await deleteProduct(archived.id);
        const page = await getAllProducts({ limit: 20 });
        expect(page.data.length).toBe(20);
        expect(await getProductSummary()).toEqual({ count: 22, lowStock: 1, retailValue: 1055, costValue: 422 });
    });
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
