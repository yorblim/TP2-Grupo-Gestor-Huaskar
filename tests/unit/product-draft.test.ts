import { describe, it, expect } from "vitest";
import { productDraft } from "../../frontend/src/features/products/productDraft";
const form = { code: " SKU-01 ", name: " Arroz ", barcode: " 12345 ", stock: 0, minStock: 5, price: 0, costPrice: 0 };
const input = { price: "5.50", cost: "3", stock: "10", minimum: "5" };
describe("Product form payload", () => {
  it("sends the barcode on create/edit and permits explicitly clearing it", () => {
    expect(productDraft(form, input, false)).toMatchObject({ barcode: "12345", code: "SKU-01", stock: 10 });
    expect(productDraft(form, input, true)).toMatchObject({ barcode: "12345" });
    expect(productDraft(form, input, true)).not.toHaveProperty("stock");
    expect(productDraft({ ...form, barcode: "" }, input, true)).toMatchObject({ barcode: null });
    expect(productDraft({ ...form, categoryId: "" }, input, true)).toMatchObject({ categoryId: null });
  });
  it("rejects empty, nonfinite, zero prices and fractional stock before submission", () => {
    for (const price of ["", "0", "Infinity", "NaN"]) expect(() => productDraft(form, { ...input, price }, false)).toThrow();
    expect(() => productDraft(form, { ...input, stock: "2.5" }, false)).toThrow();
    expect(() => productDraft(form, { ...input, minimum: "1.5" }, false)).toThrow();
    expect(() => productDraft({ ...form, maxStock: 3 }, input, false)).toThrow();
  });
});
