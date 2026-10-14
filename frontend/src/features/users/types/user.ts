export interface User {
    id: number;
    name: string;
    email: string;
    role: "ADMIN" | "CAJERO" | "ALMACEN";
    createdAt: string;
}
export interface CreateUserInput {
    name: string;
    email: string;
    password: string;
    role: "ADMIN" | "CAJERO" | "ALMACEN";
}
export interface UpdateUserInput {
    name?: string;
    email?: string;
    password?: string;
    role?: "ADMIN" | "CAJERO" | "ALMACEN";
}
