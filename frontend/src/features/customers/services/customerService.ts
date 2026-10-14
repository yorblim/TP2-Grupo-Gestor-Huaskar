import { apiList } from "../../../api";
import { API_URL, apiFetch } from "../../../api";
import type { Customer, CreateCustomerInput, UpdateCustomerInput } from "../types/customer";
export const customerService = {
    async getAll(): Promise<Customer[]> {
        return apiList<Customer>(`${API_URL}/customers`);
    },
    async create(input: CreateCustomerInput): Promise<Customer> {
        const data = await apiFetch<{
            success: boolean;
            data: Customer;
        }>(`${API_URL}/customers`, {
            method: "POST",
            body: JSON.stringify(input),
        });
        return data.data;
    },
    async update(id: string, input: UpdateCustomerInput): Promise<Customer> {
        const data = await apiFetch<{
            success: boolean;
            data: Customer;
        }>(`${API_URL}/customers/${id}`, {
            method: "PUT",
            body: JSON.stringify(input),
        });
        return data.data;
    },
    async delete(id: string): Promise<void> {
        await apiFetch(`${API_URL}/customers/${id}`, { method: "DELETE" });
    },
};
