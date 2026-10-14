import { apiList } from "../../../api";
import { API_URL } from "../../../api";
import type { PurchaseOrder, CreatePurchaseOrderInput } from "../types/purchase";
export const purchaseService = {
    async getAll(): Promise<PurchaseOrder[]> {
        return apiList<PurchaseOrder>(`${API_URL}/purchases`);
    },
    async getById(id: string): Promise<PurchaseOrder> {
        const response = await fetch(`${API_URL}/purchases/${id}`, { credentials: "include" });
        if (!response.ok)
            throw new Error("Error al obtener orden de compra");
        const data = await response.json();
        return data.data;
    },
    async create(input: CreatePurchaseOrderInput): Promise<PurchaseOrder> {
        const response = await fetch(`${API_URL}/purchases`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
            credentials: "include",
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Error al crear orden de compra");
        }
        const data = await response.json();
        return data.data;
    },
    async receive(id: string): Promise<PurchaseOrder> {
        const response = await fetch(`${API_URL}/purchases/${id}/receive`, {
            method: "PATCH",
            credentials: "include",
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Error al recibir orden de compra");
        }
        const data = await response.json();
        return data.data;
    },
    async cancel(id: string): Promise<PurchaseOrder> {
        const response = await fetch(`${API_URL}/purchases/${id}/cancel`, {
            method: "PATCH",
            credentials: "include",
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Error al cancelar orden de compra");
        }
        const data = await response.json();
        return data.data;
    },
};
