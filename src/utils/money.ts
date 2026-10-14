import { Prisma } from "@prisma/client";
import { AppError } from "./AppError";
export function money(value: Prisma.Decimal | number | string) {
    const result = new Prisma.Decimal(value);
    if (!result.isFinite())
        throw new AppError("Importe inválido.", 400);
    return result.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}
// Los precios de venta son importes finales que incluyen IGV. Documentos internos.
export function saleAmounts(subtotal: Prisma.Decimal, discountValue: number = 0) {
    const discount = money(discountValue);
    if (discount.lt(0) || discount.gte(subtotal))
        throw new AppError("El descuento debe ser menor al subtotal.", 400);
    const total = money(subtotal.minus(discount));
    const tax = money(total.mul(18).div(118));
    return { subtotal, discount, total, tax };
}
