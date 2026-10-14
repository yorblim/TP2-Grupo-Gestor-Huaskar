import { z } from "zod";
export const createProductSchema = z.object({
    code: z.string().trim().min(1, "El código es requerido"),
    name: z.string().trim().min(1, "El nombre es requerido"),
    price: z.number().positive("El precio debe ser mayor a 0"),
    costPrice: z.number().min(0, "El costo no puede ser negativo"),
    stock: z.number().int().min(0, "El stock no puede ser negativo"),
    maxStock: z.number().int().nonnegative().nullable().optional(),
    active: z.boolean().optional(),
    minStock: z.number().int().min(0, "El stock mínimo no puede ser negativo"),
    categoryId: z.string().nullable().optional(),
    barcode: z.string().trim().nullable().optional(),
    imageUrl: z.string().optional(),
});
export const updateProductSchema = createProductSchema.partial();
