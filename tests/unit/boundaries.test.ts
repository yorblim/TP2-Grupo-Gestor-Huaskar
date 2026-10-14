import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { saleAmounts, money } from '../../src/utils/money';
import { dateRange, peruDate } from '../../src/utils/dates';
import { createSaleSchema } from '../../src/modules/sale/sale.validation';
import { generateCSV } from '../../src/utils/csv';
describe('Money, dates and input boundaries', () => {
    it('calculates included tax and rounds half-up in Decimal', () => { const a = saleAmounts(new Prisma.Decimal('118'), 18); expect(a.total.toNumber()).toBe(100); expect(a.tax.toNumber()).toBe(15.25); expect(money('1.005').toNumber()).toBe(1.01); });
    it('rejects discounts producing zero or negative totals', () => { expect(() => saleAmounts(money(10), 11)).toThrow('descuento'); expect(() => saleAmounts(money(10), 10)).toThrow('descuento'); });
    it('preserves both inclusive bounds in Peru timezone', () => { const range = dateRange('2026-10-13', '2026-10-13'); expect(range.gte?.toISOString()).toBe('2026-10-13T05:00:00.000Z'); expect(range.lte?.toISOString()).toBe('2026-10-14T04:59:59.999Z'); expect(peruDate(new Date('2026-10-14T02:00:00Z'))).toBe('2026-10-13'); });
    it('rejects inverted or invalid dates', () => { expect(() => dateRange('invalid')).toThrow(); expect(() => dateRange('2026-10-14', '2026-10-13')).toThrow(); });
    it('rejects duplicate products and missing invoice documents', () => { const common = { receiptType: 'boleta', paymentMethod: 'cash', items: [{ productId: 'p', quantity: 1 }, { productId: 'p', quantity: 1 }] }; expect(createSaleSchema.safeParse(common).success).toBe(false); expect(createSaleSchema.safeParse({ ...common, receiptType: 'factura', items: [{ productId: 'p', quantity: 1 }] }).success).toBe(false); });
    it('escapes formula cells in CSV exports', () => { const csv = generateCSV(['Nombre'], [['=cmd()'], ['Producto']]); expect(csv).toContain("'=cmd()"); expect(csv).toContain('Producto'); });
});
