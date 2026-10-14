import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../src/lib/prisma';
vi.mock('../../src/lib/prisma', () => ({
    prisma: {
        $transaction: vi.fn(async (cb: any) => cb({ product: prisma.product, productBatch: { create: vi.fn() }, inventoryMovement: { create: vi.fn() } })),
        product: {
            findMany: vi.fn(),
            findUnique: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            count: vi.fn(),
        },
    },
}));
const mockProduct = {
    id: 'prod-1', active: true,
    code: 'P001',
    barcode: '123456789',
    name: 'Producto Test',
    price: 100n,
    costPrice: 60n,
    stock: 50,
    minStock: 10,
    imageUrl: null,
    categoryId: null,
    category: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
};
describe('Product Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });
    describe('createProduct', () => {
        it('should create a product successfully', async () => {
            const { createProduct } = await import('../../src/modules/product/product.service');
            vi.mocked(prisma.product.create).mockResolvedValue(mockProduct);
            const result = await createProduct({
                code: 'P001',
                name: 'Producto Test',
                price: 100,
                costPrice: 60,
                stock: 50,
                minStock: 10,
            });
            expect(result.name).toBe('Producto Test');
            expect(result.code).toBe('P001');
            expect(result.price).toBe(100);
            expect(result.stock).toBe(50);
            expect(result.isLowStock).toBe(false);
            expect(result.margin).toBe(40);
            expect(prisma.product.create).toHaveBeenCalledTimes(1);
        });
        it('should mark product as low stock when stock <= minStock', async () => {
            const { createProduct } = await import('../../src/modules/product/product.service');
            vi.mocked(prisma.product.create).mockResolvedValue({ ...mockProduct, stock: 5, minStock: 10 });
            const result = await createProduct({
                code: 'P002',
                name: 'Low Stock',
                price: 50,
                costPrice: 30,
                stock: 5,
                minStock: 10,
            });
            expect(result.isLowStock).toBe(true);
        });
    });
    describe('getProductById', () => {
        it('should return a product when found', async () => {
            const { getProductById } = await import('../../src/modules/product/product.service');
            vi.mocked(prisma.product.findUnique).mockResolvedValue(mockProduct);
            const result = await getProductById('prod-1');
            expect(result).not.toBeNull();
            expect(result!.id).toBe('prod-1');
            expect(result!.name).toBe('Producto Test');
        });
        it('should return null when product not found', async () => {
            const { getProductById } = await import('../../src/modules/product/product.service');
            vi.mocked(prisma.product.findUnique).mockResolvedValue(null);
            const result = await getProductById('nonexistent');
            expect(result).toBeNull();
        });
    });
    describe('getAllProducts', () => {
        it('should return paginated products', async () => {
            const { getAllProducts } = await import('../../src/modules/product/product.service');
            vi.mocked(prisma.product.findMany).mockResolvedValue([mockProduct]);
            vi.mocked(prisma.product.count).mockResolvedValue(1);
            const result = await getAllProducts({});
            expect(result.data).toHaveLength(1);
            expect(result.total).toBe(1);
            expect(result.page).toBe(1);
            expect(result.limit).toBe(20);
        });
        it('should pass search filter correctly', async () => {
            const { getAllProducts } = await import('../../src/modules/product/product.service');
            vi.mocked(prisma.product.findMany).mockResolvedValue([mockProduct]);
            vi.mocked(prisma.product.count).mockResolvedValue(1);
            await getAllProducts({ search: 'test' });
            expect(prisma.product.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({
                    OR: expect.arrayContaining([
                        expect.objectContaining({ name: { contains: 'test', mode: 'insensitive' } }),
                    ]),
                }),
            }));
        });
    });
    describe('updateProduct', () => {
        it('should update a product successfully', async () => {
            const { updateProduct } = await import('../../src/modules/product/product.service');
            const updated = { ...mockProduct, name: 'Updated' };
            vi.mocked(prisma.product.findUnique).mockResolvedValue(mockProduct);
            vi.mocked(prisma.product.update).mockResolvedValue(updated);
            const result = await updateProduct('prod-1', { name: 'Updated' });
            expect(result.name).toBe('Updated');
        });
        it('should throw AppError when product not found', async () => {
            const { updateProduct } = await import('../../src/modules/product/product.service');
            vi.mocked(prisma.product.findUnique).mockResolvedValue(null);
            await expect(updateProduct('nonexistent', { name: 'Updated' })).rejects.toThrow('Producto no encontrado.');
        });
        it('should exclude stock from update data', async () => {
            const { updateProduct } = await import('../../src/modules/product/product.service');
            vi.mocked(prisma.product.findUnique).mockResolvedValue(mockProduct);
            vi.mocked(prisma.product.update).mockResolvedValue(mockProduct);
            await updateProduct('prod-1', { stock: 999 });
            expect(prisma.product.update).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.not.objectContaining({ stock: expect.anything() }),
            }));
        });
    });
    describe('deleteProduct', () => {
        it('should delete a product and return true', async () => {
            const { deleteProduct } = await import('../../src/modules/product/product.service');
            vi.mocked(prisma.product.findUnique).mockResolvedValue(mockProduct);
            vi.mocked(prisma.product.delete).mockResolvedValue(mockProduct);
            const result = await deleteProduct('prod-1');
            expect(result).toBe(true);
        });
        it('should throw AppError when product not found', async () => {
            const { deleteProduct } = await import('../../src/modules/product/product.service');
            vi.mocked(prisma.product.findUnique).mockResolvedValue(null);
            await expect(deleteProduct('nonexistent')).rejects.toThrow('Producto no encontrado o tiene registros asociados.');
        });
    });
    describe('getProductByBarcode', () => {
        it('should return product when barcode matches', async () => {
            const { getProductByBarcode } = await import('../../src/modules/product/product.service');
            vi.mocked(prisma.product.findUnique).mockResolvedValue(mockProduct);
            const result = await getProductByBarcode('123456789');
            expect(result).not.toBeNull();
            expect(result!.barcode).toBe('123456789');
        });
        it('should return null when barcode not found', async () => {
            const { getProductByBarcode } = await import('../../src/modules/product/product.service');
            vi.mocked(prisma.product.findUnique).mockResolvedValue(null);
            const result = await getProductByBarcode('000000000');
            expect(result).toBeNull();
        });
    });
});
