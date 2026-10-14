export type Product = {
    id: string;
    code: string;
    barcode?: string | null;
    name: string;
    price: number;
    costPrice: number;
    stock: number;
    minStock: number;
    maxStock?: number | null;
    active?: boolean;
    imageUrl?: string | null;
    categoryId?: string | null;
    categoryName?: string | null;
    createdAt: string;
};
export type CreateProductInput = {
    code: string;
    barcode?: string;
    name: string;
    price: number;
    costPrice: number;
    stock: number;
    minStock: number;
    maxStock?: number | null;
    active?: boolean;
    imageUrl?: string;
    categoryId?: string;
};
export type UpdateProductInput = Partial<CreateProductInput>;
export type ProductResponse = Product & {
    isLowStock: boolean;
    margin?: number;
    message?: string;
};
