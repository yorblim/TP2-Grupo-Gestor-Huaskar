export const API_URL = import.meta.env.VITE_API_URL || "/api";
export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
        ...(options?.headers as Record<string, string>),
    };
    if (!(options?.body instanceof FormData)) {
        headers["Content-Type"] = headers["Content-Type"] || "application/json";
    }
    const response = await fetch(url, { ...options, headers, credentials: "include" });
    if (response.status === 401) {
        window.location.href = "/login";
        throw new Error("Sesión expirada");
    }
    const data = await response.json();
    if (!response.ok || data?.success === false)
        throw new Error(data?.message || "No se pudo completar la operación");
    return data;
}
export async function apiList<T>(url: string): Promise<T[]> { const endpoint = new URL(url, window.location.origin); endpoint.searchParams.set("limit", "100"); endpoint.searchParams.set("page", "1"); const first = await apiFetch<{
    data: T[];
    totalPages?: number;
}>(endpoint.toString()); const list = [...first.data]; for (let page = 2; page <= (first.totalPages || 1); page++) {
    endpoint.searchParams.set("page", String(page));
    const next = await apiFetch<{
        data: T[];
    }>(endpoint.toString());
    list.push(...next.data);
} return list; }
