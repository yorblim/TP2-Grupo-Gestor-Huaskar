import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../src/lib/prisma';
import { AppError } from '../../src/utils/AppError';
vi.mock('../../src/lib/prisma', () => ({
    prisma: {
        user: {
            findUnique: vi.fn(),
            create: vi.fn(),
        },
    },
}));
vi.mock('bcrypt', () => ({
    default: {
        hash: vi.fn(),
        compare: vi.fn(),
    },
    hash: vi.fn(),
    compare: vi.fn(),
}));
vi.mock('jsonwebtoken', () => ({
    default: {
        sign: vi.fn(),
    },
    sign: vi.fn(),
}));
const mockUser = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    password: '$2b$10$hashedpassword',
    role: 'CAJERO' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
};
describe('Auth Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    describe('registerService', () => {
        it('should register a new user successfully', async () => {
            const { registerService } = await import('../../src/modules/auth/auth.service');
            vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
            vi.mocked(bcrypt.hash).mockResolvedValue('$2b$10$hashedpassword' as never);
            vi.mocked(prisma.user.create).mockResolvedValue(mockUser);
            const result = await registerService({
                name: 'Test User',
                email: 'test@example.com',
                password: 'Test123*',
            });
            expect(result.success).toBe(true);
            expect(result.user.name).toBe('Test User');
            expect(result.user.email).toBe('test@example.com');
            expect(result.user.role).toBe('CAJERO');
        });
        it('should throw error when email already exists', async () => {
            const { registerService } = await import('../../src/modules/auth/auth.service');
            vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
            try {
                await registerService({
                    name: 'Test User',
                    email: 'test@example.com',
                    password: 'Test123*',
                });
                expect.unreachable('Should have thrown');
            }
            catch (error) {
                expect(error).toBeInstanceOf(AppError);
                expect((error as any).statusCode).toBe(409);
                expect((error as any).message).toBe('El correo ya está registrado.');
            }
        });
    });
    describe('loginService', () => {
        it('should login successfully with valid credentials', async () => {
            const { loginService } = await import('../../src/modules/auth/auth.service');
            vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
            vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
            vi.mocked(jwt.sign).mockReturnValue('mock-token' as never);
            const result = await loginService('test@example.com', 'Test123*');
            expect(result.success).toBe(true);
            expect(result.token).toBe('mock-token');
            expect(result.user.email).toBe('test@example.com');
        });
        it('should throw error when user not found', async () => {
            const { loginService } = await import('../../src/modules/auth/auth.service');
            vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
            try {
                await loginService('nonexistent@test.com', 'password');
                expect.unreachable('Should have thrown');
            }
            catch (error) {
                expect(error).toBeInstanceOf(AppError);
                expect((error as any).statusCode).toBe(401);
                expect((error as any).message).toBe('Credenciales incorrectas');
            }
        });
        it('should throw error when password is incorrect', async () => {
            const { loginService } = await import('../../src/modules/auth/auth.service');
            vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
            vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
            try {
                await loginService('test@example.com', 'wrongpassword');
                expect.unreachable('Should have thrown');
            }
            catch (error) {
                expect(error).toBeInstanceOf(AppError);
                expect((error as any).statusCode).toBe(401);
                expect((error as any).message).toBe('Credenciales incorrectas');
            }
        });
    });
});
