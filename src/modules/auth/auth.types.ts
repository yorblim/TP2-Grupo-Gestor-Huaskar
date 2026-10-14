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
export interface RegisterInput {
    name: string;
    email: string;
    password: string;
}
export interface RegisterResponse {
    success: boolean;
    message: string;
    user: AuthUser;
}
