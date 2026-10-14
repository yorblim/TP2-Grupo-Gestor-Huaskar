import { API_URL } from "../../../api";
import type { Sale, CreateSaleInput } from "../types/sale";
export const saleService = {
    async getPage(page = 1): Promise<{
        data: Sale[];
        total: number;
        totalPages: number;
    }> { const response = await fetch(`${API_URL}/sales?page=${page}&limit=20`, { credentials: "include" }); if (!response.ok)
        throw new Error("Error al obtener ventas"); return response.json(); },
    async getAll(): Promise<Sale[]> {
        const response = await fetch(`${API_URL}/sales`, { credentials: "include" });
        if (!response.ok)
            throw new Error("Error al obtener ventas");
        const data = await response.json();
        return data.success ? data.data : [];
    },
    async create(input: CreateSaleInput): Promise<Sale> {
        const response = await fetch(`${API_URL}/sales`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
            credentials: "include",
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Error al crear venta");
        }
        const data = await response.json();
        return data.data;
    },
    async cancel(id: string): Promise<Sale> {
        const response = await fetch(`${API_URL}/sales/${id}/cancel`, {
            method: "PATCH",
            credentials: "include",
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Error al anular venta");
        }
        const data = await response.json();
        return data.data;
    },
    async delete(id: string): Promise<void> {
        const response = await fetch(`${API_URL}/sales/${id}`, {
            method: "DELETE",
            credentials: "include",
        });
        if (!response.ok)
            throw new Error("Error al eliminar venta");
    },
};
