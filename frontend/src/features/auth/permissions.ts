import type { UserRole } from "./types/auth";
export const roleLabels: Record<UserRole, string> = { ADMIN: "Administrador", CAJERO: "Cajero", ALMACEN: "Almacén" };
const paths: Record<UserRole, string[]> = {
    ADMIN: ["/dashboard", "/products", "/categories", "/sales", "/customers", "/reports", "/inventory", "/suppliers", "/purchases", "/cash-register", "/purchase-suggestions", "/batches", "/users", "/audit-logs", "/import"],
    CAJERO: ["/sales", "/customers", "/cash-register"],
    ALMACEN: ["/products", "/categories", "/inventory", "/suppliers", "/purchases", "/purchase-suggestions", "/batches", "/import"],
};
export function homeForRole(role?: UserRole) { return role === "CAJERO" ? "/sales" : role === "ALMACEN" ? "/inventory" : "/dashboard"; }
export function canAccessPath(role: UserRole | undefined, pathname: string) { return !!role && paths[role]?.includes(pathname.replace(/\/$/, "")); }
