/// <reference types="node" />
import { describe, it, expect } from "vitest";
import { prisma } from "./setup";
import { loginService, registerService } from "../src/modules/auth/auth.service";
describe("Auth Service", () => {
    it("should register a new user", async () => {
        const result = await registerService({
            name: "Test User",
            email: "test@example.com",
            password: "Test123*",
        });
        expect(result.success).toBe(true);
        expect(result.user.name).toBe("Test User");
        expect(result.user.email).toBe("test@example.com");
        expect(result.user.role).toBe("CAJERO");
        const saved = await prisma.user.findUnique({ where: { email: "test@example.com" } });
        expect(saved).toBeDefined();
        expect(saved?.name).toBe("Test User");
    });
    it("should not register a duplicate email", async () => {
        await registerService({
            name: "User 1",
            email: "dup@example.com",
            password: "Test123*",
        });
        await expect(registerService({
            name: "User 2",
            email: "dup@example.com",
            password: "Test456*",
        })).rejects.toThrow("El correo ya está registrado.");
    });
    it("should login with correct credentials", async () => {
        await registerService({
            name: "Login User",
            email: "login@example.com",
            password: "MyPass123*",
        });
        const result = await loginService("login@example.com", "MyPass123*");
        expect(result.success).toBe(true);
        expect(result.token).toBeDefined();
        expect(result.token.length).toBeGreaterThan(0);
        expect(result.user.email).toBe("login@example.com");
        expect(result.user.name).toBe("Login User");
    });
    it("should reject invalid credentials", async () => {
        await expect(loginService("nonexistent@example.com", "wrongpass")).rejects.toThrow("Credenciales incorrectas");
    });
    it("should reject wrong password", async () => {
        await registerService({
            name: "Wrong Pass",
            email: "wrongpass@example.com",
            password: "CorrectPass1*",
        });
        await expect(loginService("wrongpass@example.com", "WrongPass1*")).rejects.toThrow("Credenciales incorrectas");
    });
});
