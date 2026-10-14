import { testCashier } from "./helpers";
import { describe, it, expect } from 'vitest';
import { createProduct } from '../src/modules/product/product.service';
import { createSale } from '../src/modules/sale/sale.service';
import { getReceiptText } from '../src/modules/print/print.service';
describe('Print Service', () => {
    it('should generate receipt text for a sale', async () => {
        const product = await createProduct({
            code: 'PRINT001',
            name: 'Producto Recibo',
            price: 15.00,
            stock: 50,
            minStock: 5,
        });
        const sale = await createSale({
            receiptType: 'boleta',
            customerName: 'Cliente Recibo',
            paymentMethod: 'cash',
            items: [{ productId: product.id, quantity: 2 }],
        }, await testCashier());
        const text = await getReceiptText(sale.id);
        expect(text).toBeDefined();
        expect(text).toContain('HUSKAR Minimarket');
        expect(text).toContain('Producto Recibo');
        expect(text).toContain('30.00');
        expect(text).toContain('Gracias por su compra');
    });
    it('should throw AppError for non-existent sale', async () => {
        await expect(getReceiptText('nonexistent-id')).rejects.toThrow('Venta no encontrada');
    });
});
