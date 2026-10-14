import { z } from "zod";
export const createSupplierSchema = z.object({
    name: z.string().min(1, "El nombre es requerido"),
    ruc: z.string().regex(/^\d{11}$/, "El RUC debe tener 11 dígitos"),
    contact: z.string().min(1, "El contacto es requerido"),
    phone: z.string().min(1, "El teléfono es requerido"),
    address: z.string().min(1, "La dirección es requerida"),
});
export const updateSupplierSchema = createSupplierSchema.partial().extend({
    status: z.enum(["active", "inactive"]).optional(),
});
