import { apiList } from "../../../api";
import { API_URL } from "../../../api";
import type { MovementResponse, CreateMovementInput } from "../types/inventory";
export const inventoryService = {
    async getAll(): Promise<MovementResponse[]> {
        return apiList<MovementResponse>(`${API_URL}/inventory`);
    },
    async getByProduct(productId: string): Promise<MovementResponse[]> {
        const response = await fetch(`${API_URL}/inventory/product/${productId}`, { credentials: "include" });
        if (!response.ok)
            throw new Error("Error al obtener movimientos del producto");
        const data = await response.json();
        return data.success ? data.data : [];
    },
    async create(input: CreateMovementInput): Promise<MovementResponse> {
        const response = await fetch(`${API_URL}/inventory`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
            credentials: "include",
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Error al crear movimiento");
        }
        const data = await response.json();
        return data.data;
    },
};
