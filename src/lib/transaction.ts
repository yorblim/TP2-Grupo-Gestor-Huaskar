import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
export async function serialTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    for (let attempt = 0;; attempt++) {
        try {
            return await prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 });
        }
        catch (error) {
            const retryable = error instanceof Prisma.PrismaClientKnownRequestError &&
                (error.code === "P2034" || (error.code === "P2010" && ["40001", "40P01"].includes(String(error.meta?.code))));
            if (!retryable || attempt >= 4)
                throw error;
            await new Promise(resolve => setTimeout(resolve, 10 * (attempt + 1)));
        }
    }
}
export async function lockProducts(tx: Prisma.TransactionClient, ids: string[]) {
    const sorted = [...new Set(ids)].sort();
    if (sorted.length)
        await tx.$queryRaw(Prisma.sql `SELECT "id" FROM "Product" WHERE "id" IN (${Prisma.join(sorted)}) ORDER BY "id" FOR UPDATE`);
}
export async function lockCash(tx: Prisma.TransactionClient) {
    await tx.$queryRaw `SELECT 1 AS locked FROM pg_advisory_xact_lock(843210)`;
}
