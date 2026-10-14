import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
function getPaymentLabel(method: string): string {
    switch (method) {
        case "CASH": return "Efectivo";
        case "CARD": return "Tarjeta";
        case "YAPE": return "Yape";
        case "PLIN": return "Plin";
        default: return method;
    }
}
function generateReceiptText(sale: any): string {
    const lines: string[] = [];
    const sep = "=".repeat(32);
    const dash = "-".repeat(32);
    lines.push("");
    lines.push(process.env.BUSINESS_NAME || "HUSKAR Minimarket");
    if (process.env.BUSINESS_RUC)
        lines.push("RUC: " + process.env.BUSINESS_RUC);
    lines.push(process.env.BUSINESS_ADDRESS || "Cusco, Perú");
    if (process.env.BUSINESS_PHONE)
        lines.push("Tel: " + process.env.BUSINESS_PHONE);
    lines.push(sep);
    lines.push(`  ${sale.receiptType === "FACTURA" ? "FACTURA" : "BOLETA"} INTERNA`);
    lines.push("Documento interno, sin emisión SUNAT");
    lines.push(`  N°: ${sale.receiptSeries && sale.receiptNumber ? sale.receiptSeries + "-" + String(sale.receiptNumber).padStart(8, "0") : sale.id.slice(0, 8).toUpperCase()}`);
    lines.push(`  Fecha: ${new Date(sale.createdAt).toLocaleString("es-PE", { timeZone: "America/Lima" })}`);
    if (sale.customerName) {
        lines.push(`  Cliente: ${sale.customerName}`);
        if (sale.customerDocNumber)
            lines.push(`  ${sale.customerDocType}: ${sale.customerDocNumber}`);
    }
    lines.push(sep);
    lines.push("  CANT  PRODUCTO         TOTAL");
    lines.push(dash);
    for (const item of sale.items) {
        const qty = String(item.quantity).padStart(4);
        const name = (item.productName || item.product?.name || "").padEnd(15).slice(0, 15);
        const total = item.subtotal.toFixed(2).padStart(8);
        const barcode = (item.product?.barcode || "").slice(0, 8);
        const line = `  ${qty}  ${name}  ${total}`;
        lines.push(line);
        if (barcode)
            lines.push(`       [${barcode}]`);
    }
    lines.push(dash);
    if (sale.discount > 0) {
        lines.push(`  Subtotal:              ${sale.subtotal.toFixed(2)}`);
        lines.push(`  Descuento:             -${sale.discount.toFixed(2)}`);
    }
    if (sale.tax > 0) {
        lines.push(`  IGV incluido:             ${sale.tax.toFixed(2)}`);
    }
    lines.push(`  TOTAL:                 ${sale.total.toFixed(2)}`);
    lines.push(sep);
    if (sale.payments && sale.payments.length > 1) {
        for (const p of sale.payments) {
            lines.push(`  ${getPaymentLabel(p.method).padEnd(12)}  ${p.amount.toFixed(2)}`);
        }
    }
    else {
        lines.push(`  Pago: ${getPaymentLabel(sale.paymentMethod)}`);
    }
    lines.push("");
    lines.push("  Gracias por su compra!");
    lines.push(`  ${new Date().toLocaleString("es-PE")}`);
    lines.push("");
    lines.push("\n\n\n");
    return lines.join("\n");
}
export async function getReceiptText(saleId: string): Promise<string> {
    const sale = await prisma.sale.findUnique({
        where: { id: saleId },
        include: {
            items: {
                include: { product: { select: { name: true, barcode: true } } },
            },
            payments: true,
        },
    });
    if (!sale) {
        throw new AppError("Venta no encontrada", 404);
    }
    const items = sale.items.map((i) => ({
        productName: i.productName || i.product.name,
        quantity: i.quantity,
        unitPrice: parseFloat(i.unitPrice.toString()),
        subtotal: parseFloat(i.subtotal.toString()),
        product: { barcode: i.product.barcode },
    }));
    const payments = sale.payments.map((p) => ({
        method: p.method,
        amount: parseFloat(p.amount.toString()),
    }));
    return generateReceiptText({
        ...sale,
        total: parseFloat(sale.total.toString()),
        subtotal: parseFloat(sale.subtotal.toString()),
        discount: parseFloat(sale.discount.toString()),
        tax: parseFloat(sale.tax.toString()),
        items,
        payments,
    });
}
