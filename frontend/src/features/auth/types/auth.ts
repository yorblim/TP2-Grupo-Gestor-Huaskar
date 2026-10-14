export type UserRole = "ADMIN" | "CAJERO" | "ALMACEN";
export interface AuthUser {
    id: number;
    name: string;
    email: string;
    role: UserRole;
}
export interface LoginResponse {
    success: boolean;
    message: string;
    token: string;
    user: AuthUser;
}
export interface AuthState {
    user: AuthUser | null;
    token: string | null;
    isAuthenticated: boolean;
}
