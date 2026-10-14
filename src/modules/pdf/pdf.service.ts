import PDFDocument from "pdfkit";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
export async function getInvoiceSale(saleId: string) { const sale = await prisma.sale.findUnique({ where: { id: saleId }, include: { items: { include: { product: { select: { name: true } } } }, customer: true, payments: true } }); if (!sale)
    throw new AppError("Venta no encontrada", 404); return sale; }
export function buildInvoicePDF(sale: any): PDFKit.PDFDocument {
    const doc = new PDFDocument({ margin: 40, size: "A4", bufferPages: true });
    const currency = (n: any) => `S/ ${Number(n).toFixed(2)}`;
    const header = () => { doc.x = 40; doc.y = 40; doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(20).text(process.env.BUSINESS_NAME || "HUSKAR Minimarket"); doc.font("Helvetica").fontSize(9).fillColor("#475569").text(process.env.BUSINESS_ADDRESS || "Cusco, Perú"); if (process.env.BUSINESS_RUC)
        doc.text(`RUC: ${process.env.BUSINESS_RUC}`); if (process.env.BUSINESS_PHONE)
        doc.text(`Teléfono: ${process.env.BUSINESS_PHONE}`); doc.moveDown().fillColor("#c2410c").font("Helvetica-Bold").fontSize(13).text(`${sale.receiptType === "FACTURA" ? "FACTURA" : "BOLETA"} INTERNA`); doc.font("Helvetica").fontSize(9).fillColor("#475569").text("Documento interno. No constituye emisión electrónica autorizada por SUNAT."); doc.moveDown(); };
    header();
    const number = sale.receiptSeries && sale.receiptNumber ? `${sale.receiptSeries}-${String(sale.receiptNumber).padStart(8, "0")}` : `Histórico ${sale.id.slice(0, 8).toUpperCase()}`;
    doc.fillColor("#0f172a").text(`Número: ${number}`).text(`Fecha: ${new Date(sale.createdAt).toLocaleString("es-PE", { timeZone: "America/Lima" })}`).text(`Cliente: ${sale.customerName || sale.customer?.name || "Consumidor final"}`);
    if (sale.customerDocNumber)
        doc.text(`${sale.customerDocType}: ${sale.customerDocNumber}`);
    if (sale.status === "CANCELLED")
        doc.fillColor("#b91c1c").font("Helvetica-Bold").text("ANULADA");
    doc.moveDown();
    const tableHead = () => { const y = doc.y; doc.rect(40, y, 515, 24).fill("#f1f5f9"); doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(9).text("Producto", 48, y + 7, { width: 260 }).text("Cant.", 320, y + 7, { width: 40, align: "right" }).text("P. unit.", 378, y + 7, { width: 65, align: "right" }).text("Importe", 465, y + 7, { width: 80, align: "right" }); doc.y = y + 32; };
    tableHead();
    for (const item of sale.items) {
        const name = item.productName || item.product?.name || "Producto";
        doc.font("Helvetica").fontSize(9);
        const height = Math.max(22, doc.heightOfString(name, { width: 260 }) + 10);
        if (doc.y + height > 690) {
            doc.addPage();
            header();
            tableHead();
        }
        doc.font("Helvetica").fontSize(9);
        const y = doc.y;
        doc.fillColor("#0f172a").text(name, 48, y, { width: 260 });
        doc.text(String(item.quantity), 320, y, { width: 40, align: "right" });
        doc.text(currency(item.unitPrice), 378, y, { width: 65, align: "right" });
        doc.text(currency(item.subtotal), 465, y, { width: 80, align: "right" });
        doc.y = y + height;
    }
    if (doc.y > 610) {
        doc.addPage();
        header();
    }
    doc.moveDown();
    doc.x = 40;
    doc.font("Helvetica").fontSize(10).text(`Importe de productos: ${currency(sale.subtotal)}`, { align: "right" }).text(`Descuento: ${currency(sale.discount)}`, { align: "right" }).text(`IGV incluido: ${currency(sale.tax)}`, { align: "right" }).font("Helvetica-Bold").fontSize(14).text(`TOTAL: ${currency(sale.total)}`, { align: "right" });
    doc.moveDown().font("Helvetica").fontSize(9);
    for (const p of sale.payments || [])
        doc.text(`${({ CASH: "Efectivo", CARD: "Tarjeta", YAPE: "Yape", PLIN: "Plin" } as Record<string, string>)[p.method]}: ${currency(p.amount)}`, { align: "right" });
    doc.moveDown().text("Gracias por su compra.", { align: "center" });
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.font("Helvetica").fontSize(8).fillColor("#64748b").text(`Página ${i + 1} de ${pages.count}`, 40, doc.page.height - 50, { width: 515, align: "right", lineBreak: false });
    }
    doc.end();
    return doc;
}
