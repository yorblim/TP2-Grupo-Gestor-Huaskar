import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
const prisma = new PrismaClient();
async function main() {
    const email = (process.env.SEED_ADMIN_EMAIL || 'admin@huskar.com').trim().toLowerCase();
    if (await prisma.user.findUnique({ where: { email } })) {
        console.log('El usuario ya existe. No se modificaron sus datos.');
        return;
    }
    const password = process.env.SEED_ADMIN_PASSWORD;
    if (!password || password.length < 12)
        throw new Error('Configura SEED_ADMIN_PASSWORD con al menos 12 caracteres. No se utilizan claves predeterminadas.');
    await prisma.user.create({ data: { name: process.env.SEED_ADMIN_NAME || 'Administrador', email, password: await bcrypt.hash(password, 12), role: 'ADMIN' } });
    console.log('Administrador inicial creado. No se eliminaron registros ni se cargaron datos de demostración.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
