import { testCashier } from "./helpers";
/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import { prisma } from './setup';
import { createProduct } from '../src/modules/product/product.service';
import { createSupplier } from '../src/modules/supplier/supplier.service';
import { createSale } from '../src/modules/sale/sale.service';
import { createPurchaseOrder, receivePurchaseOrder } from '../src/modules/purchase/purchase.service';
import { getSalesReport, getLowStockReport, getPurchasesReport } from '../src/modules/report/report.service';
describe('Reports Service', () => {
    it('should generate sales report', async () => {
        const product = await createProduct({
            code: 'REP001',
            name: 'Producto Reporte Test',
            price: 10.00,
            stock: 50,
            minStock: 10,
        });
        const sale = await createSale({
            receiptType: 'boleta',
            customerName: 'Cliente Reporte Test',
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
        const report = await getSalesReport({});
        expect(report).toBeDefined();
        expect(report.items).toBeDefined();
        expect(Array.isArray(report.items)).toBe(true);
        expect(report.items.length).toBeGreaterThanOrEqual(1);
        expect(report.summary).toBeDefined();
        expect(report.summary.totalSales).toBeGreaterThanOrEqual(1);
        expect(report.summary.totalRevenue).toBeGreaterThan(0);
    });
    it('should generate low stock report', async () => {
        // Crear producto con stock bajo
        await createProduct({
            code: 'REP002',
            name: 'Producto Stock Bajo Test',
            price: 15.00,
            stock: 3,
            minStock: 10,
        });
        // Crear producto con stock normal
        await createProduct({
            code: 'REP003',
            name: 'Producto Stock Normal Test',
            price: 20.00,
            stock: 50,
            minStock: 10,
        });
        const report = await getLowStockReport();
        expect(report).toBeDefined();
        expect(report.items).toBeDefined();
        expect(Array.isArray(report.items)).toBe(true);
        expect(report.count).toBeGreaterThanOrEqual(1);
        // Verificar que solo productos con stock bajo aparezcan
        const lowStockProduct = report.items.find(p => p.code === 'REP002');
        expect(lowStockProduct).toBeDefined();
        const normalStockProduct = report.items.find(p => p.code === 'REP003');
        expect(normalStockProduct).toBeUndefined();
    });
    it('should generate purchases report', async () => {
        const supplier = await createSupplier({
            name: 'Proveedor Reporte Test',
            ruc: '2012345678' + Math.floor(Math.random() * 1000),
            contact: 'Juan Pérez',
            phone: '987654321',
            address: 'Av. Test 123',
        });
        const product = await createProduct({
            code: 'REP004',
            name: 'Producto Compra Reporte Test',
            price: 10.00,
            stock: 20,
            minStock: 5,
        });
        const order = await createPurchaseOrder({
            supplierId: supplier.id,
            items: [
                {
                    productId: product.id,
                    quantity: 10,
                    unitPrice: 8.00,
                },
            ],
        });
        await receivePurchaseOrder(order.id);
        const report = await getPurchasesReport({});
        expect(report).toBeDefined();
        expect(report.items).toBeDefined();
        expect(Array.isArray(report.items)).toBe(true);
        expect(report.items.length).toBeGreaterThanOrEqual(1);
        expect(report.summary).toBeDefined();
        expect(report.summary.totalPurchases).toBeGreaterThanOrEqual(1);
        expect(report.summary.totalAmount).toBeGreaterThan(0);
    });
});
