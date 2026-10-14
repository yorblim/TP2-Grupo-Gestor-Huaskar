import { API_URL, apiFetch } from "../../../api";
import type { Product, CreateProductInput, UpdateProductInput } from "../types/product";
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export const productService = {
    async getAllOptions(): Promise<Product[]> { const first = await this.getAll(1, 100); const result = [...first.data]; for (let page = 2; page <= first.totalPages; page++)
        result.push(...(await this.getAll(page, 100)).data); return result; },
    async getAll(page = 1, limit = 20, search = ""): Promise<PaginatedResponse<Product>> {
        const params = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (search)
            params.set("search", search);
        const response = await apiFetch<{
            success: boolean;
        } & PaginatedResponse<Product>>(`${API_URL}/products?${params}`);
        return {
            data: response.data || [],
            total: response.total || 0,
            page: response.page || 1,
            limit: response.limit || 20,
            totalPages: response.totalPages || 0,
        };
    },
    async create(input: CreateProductInput): Promise<Product> {
        const response = await apiFetch<{
            success: boolean;
            data: Product;
        }>(`${API_URL}/products`, {
            method: "POST",
            body: JSON.stringify(input),
        });
        return response.data;
    },
    async update(id: string, input: UpdateProductInput): Promise<Product> {
        const response = await apiFetch<{
            success: boolean;
            data: Product;
        }>(`${API_URL}/products/${id}`, {
            method: "PUT",
            body: JSON.stringify(input),
        });
        return response.data;
    },
    async delete(id: string): Promise<void> {
        await apiFetch(`${API_URL}/products/${id}`, { method: "DELETE" });
    },
};
