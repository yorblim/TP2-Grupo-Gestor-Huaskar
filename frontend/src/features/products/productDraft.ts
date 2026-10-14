import type { CreateProductInput, UpdateProductInput } from "./types/product";
export function productDraft(form: CreateProductInput, inputs: { price: string; cost: string; stock: string; minimum: string }, editing: boolean): CreateProductInput | UpdateProductInput {
  const price = Number(inputs.price), costPrice = Number(inputs.cost), stock = Number(inputs.stock), minStock = Number(inputs.minimum);
  if (!form.code.trim() || !form.name.trim()) throw new Error("Escribe el código y nombre del producto.");
  if (!inputs.price.trim() || !Number.isFinite(price) || price <= 0) throw new Error("El precio de venta debe ser mayor a cero.");
  if (!inputs.cost.trim() || !Number.isFinite(costPrice) || costPrice < 0) throw new Error("El costo debe ser un número válido mayor o igual a cero.");
  if (!inputs.minimum.trim() || !Number.isSafeInteger(minStock) || minStock < 0) throw new Error("El stock mínimo debe ser un número entero mayor o igual a cero.");
  if (!editing && (!inputs.stock.trim() || !Number.isSafeInteger(stock) || stock < 0)) throw new Error("El stock inicial debe ser un número entero mayor o igual a cero.");
  if (form.maxStock != null && (!Number.isSafeInteger(form.maxStock) || form.maxStock < minStock)) throw new Error("El stock máximo debe ser entero y no menor que el mínimo.");
  const data = { code: form.code.trim(), name: form.name.trim(), barcode: form.barcode?.trim() || null, price, costPrice, minStock, maxStock: form.maxStock ?? null, categoryId: form.categoryId || (editing ? null : undefined) };
  return editing ? data : { ...data, stock };
}
