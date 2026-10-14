import { apiList } from "../../../api";
import { API_URL } from "../../../api";
import type { Supplier, CreateSupplierInput, UpdateSupplierInput } from "../types/supplier";
export const supplierService = {
    async getAll(): Promise<Supplier[]> {
        return apiList<Supplier>(`${API_URL}/suppliers`);
    },
    async getById(id: string): Promise<Supplier> {
        const response = await fetch(`${API_URL}/suppliers/${id}`, { credentials: "include" });
        if (!response.ok)
            throw new Error("Error al obtener proveedor");
        const data = await response.json();
        return data.data;
    },
    async create(input: CreateSupplierInput): Promise<Supplier> {
        const response = await fetch(`${API_URL}/suppliers`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
            credentials: "include",
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Error al crear proveedor");
        }
        const data = await response.json();
        return data.data;
    },
    async update(id: string, input: UpdateSupplierInput): Promise<Supplier> {
        const response = await fetch(`${API_URL}/suppliers/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
            credentials: "include",
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Error al actualizar proveedor");
        }
        const data = await response.json();
        return data.data;
    },
    async delete(id: string): Promise<void> {
        const response = await fetch(`${API_URL}/suppliers/${id}`, {
            method: "DELETE",
            credentials: "include",
        });
        if (!response.ok)
            throw new Error("Error al eliminar proveedor");
    },
};
