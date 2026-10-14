import { z } from "zod";
export const createMovementSchema = z.object({
    productId: z.string().min(1, "Producto requerido"),
    movementType: z.literal("adjustment", { message: "Solo se permiten ajustes manuales" }),
    quantity: z.number().int("La cantidad debe ser entero").refine(q => q !== 0, "La cantidad no puede ser cero"),
    reason: z.string().trim().min(3, "Describe el motivo del ajuste"),
    referenceId: z.string().optional(),
});
