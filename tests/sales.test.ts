import { testCashier } from "./helpers";
/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import { prisma } from './setup';
import { createProduct } from '../src/modules/product/product.service';
import { createSale, cancelSale, getAllSales } from '../src/modules/sale/sale.service';
describe('Sales Service', () => {
    it('should create a sale and deduct stock', async () => {
        const product = await createProduct({
            code: 'SALE001',
            name: 'Producto Venta Test',
            price: 10.00,
            stock: 50,
            minStock: 10,
        });
        const sale = await createSale({
            receiptType: 'boleta',
            customerName: 'Cliente Test',
            paymentMethod: 'cash',
            items: [
                {
                    productId: product.id,
                    quantity: 5,
                },
            ],
        }, await testCashier());
        expect(sale).toBeDefined();
        expect(sale.status).toBe('active');
        expect(sale.items).toHaveLength(1);
        expect(sale.items[0].quantity).toBe(5);
        expect(sale.items[0].unitPrice).toBe(10);
        expect(sale.items[0].subtotal).toBe(50);
        expect(sale.total).toBe(50.00);
        // Verificar que el stock se descontó
        const updatedProduct = await prisma.product.findUnique({
            where: { id: product.id },
        });
        expect(updatedProduct?.stock).toBe(45);
        // Verificar que se creó inventory movement
        const movements = await prisma.inventoryMovement.findMany({
            where: { productId: product.id },
        });
        expect(movements.length).toBeGreaterThan(0);
        const saleMovement = movements.find(m => m.movementType === 'SALE');
        expect(saleMovement).toBeDefined();
        expect(saleMovement?.quantity).toBe(5);
        expect(saleMovement?.stockBefore).toBe(50);
        expect(saleMovement?.stockAfter).toBe(45);
    });
    it('should cancel a sale and restore stock', async () => {
        const product = await createProduct({
            code: 'SALE002',
            name: 'Producto Cancelación Test',
            price: 20.00,
            stock: 30,
            minStock: 5,
        });
        const sale = await createSale({
            receiptType: 'boleta',
            customerName: 'Cliente Test 2',
            paymentMethod: 'card',
            items: [
                {
                    productId: product.id,
                    quantity: 3,
                },
            ],
        }, await testCashier());
        const cancelledSale = await cancelSale(sale.id);
        expect(cancelledSale).toBeDefined();
        expect(cancelledSale?.status).toBe('cancelled');
        expect(cancelledSale?.cancelledAt).toBeDefined();
        // Verificar que el stock se restauró
        const updatedProduct = await prisma.product.findUnique({
            where: { id: product.id },
        });
        expect(updatedProduct?.stock).toBe(30);
    });
    it('should get all sales', async () => {
        const product = await createProduct({
            code: 'SALE003',
            name: 'Producto Listado Test',
            price: 15.00,
            stock: 25,
            minStock: 5,
        });
        await createSale({
            receiptType: 'factura', customerDocType: 'ruc', customerDocNumber: '20123456789',
            customerName: 'Empresa Test',
            paymentMethod: 'yape',
            items: [
                {
                    productId: product.id,
                    quantity: 2,
                },
            ],
        }, await testCashier());
        const result = await getAllSales();
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.data.length).toBeGreaterThan(0);
        expect(result.total).toBeGreaterThan(0);
    });
    it('should keep historical unit price and subtotal after product price changes', async () => {
        const product = await createProduct({
            code: 'SALE004',
            name: 'Producto Histórico Test',
            price: 12.50,
            stock: 40,
            minStock: 5,
        });
        const sale = await createSale({
            receiptType: 'boleta',
            customerName: 'Cliente Histórico',
            paymentMethod: 'cash',
            items: [
                {
                    productId: product.id,
                    quantity: 4,
                },
            ],
        }, await testCashier());
        await prisma.product.update({
            where: { id: product.id },
            data: { price: 20.00 },
        });
        const salesResult = await getAllSales();
        const savedSale = salesResult.data.find((item: any) => item.id === sale.id);
        expect(savedSale).toBeDefined();
        expect(savedSale?.items).toHaveLength(1);
        expect(savedSale?.items[0].unitPrice).toBe(12.5);
        expect(savedSale?.items[0].subtotal).toBe(50);
        expect(savedSale?.total).toBe(50);
    });
});
