import { prisma } from "../../lib/prisma";
import { generateCSV } from "../../utils/csv";
import PDFDocument from "pdfkit";
import type { Request, Response, NextFunction } from "express";
import { AppError } from "../../utils/AppError";
import { getSalesReport, getPurchasesReport, getLowStockReport, getTopSellingReport, getProfitReport, getDailyClose } from "./report.service";
import { getSessions } from "../cashregister/cashregister.service";
export async function reportPDF(req: Request, res: Response, next: NextFunction) {
    try {
        const type = req.params.type as string;
        const filters = { startDate: req.query.startDate as string | undefined, endDate: req.query.endDate as string | undefined };
        const handlers: Record<string, () => Promise<any>> = { sales: () => getSalesReport(filters), purchases: () => getPurchasesReport(filters), inventory: async () => ({ items: (await prisma.product.findMany({ orderBy: { name: "asc" } })).map(p => ({ code: p.code, name: p.name, stock: p.stock, minStock: p.minStock, price: Number(p.price), cost: Number(p.costPrice), active: p.active })) }), "top-selling": () => getTopSellingReport(filters), profit: () => getProfitReport(filters), "daily-close": () => getDailyClose(filters), "cash-sessions": async () => { const first = await getSessions({ ...req.query, page: 1, limit: 100 }); const rows = [...first.data]; for (let page = 2; page <= first.totalPages; page++)
                rows.push(...(await getSessions({ ...req.query, page, limit: 100 })).data); return { items: rows }; } };
        if (!handlers[type])
            throw new AppError("Reporte no encontrado.", 404);
        const data = await handlers[type]();
        if (req.path.endsWith(".csv")) {
            const rows = data.items || data.data || [];
            const columns = rows.length ? Object.keys(rows[0]) : ["Sin registros"];
            const csv = generateCSV(columns, rows.map((row: Record<string, unknown>) => columns.map(k => row[k])));
            res.type("text/csv").setHeader("Content-Disposition", `attachment; filename="reporte-${type}.csv"`);
            res.send(csv);
            return;
        }
        const doc = new PDFDocument({ size: "A4", margin: 40 });
        res.type("pdf").setHeader("Content-Disposition", `attachment; filename="reporte-${type}.pdf"`);
        doc.pipe(res);
        doc.fontSize(18).text("HUSKAR · Reporte interno").fontSize(11).text(type).text(`${filters.startDate || "Inicio"} — ${filters.endDate || "Actual"}`);
        doc.moveDown();
        const rows = data.items || data.data || [];
        for (const row of rows) {
            if (doc.y > 690)
                doc.addPage();
            const line = Object.entries(row).filter(([k]) => !['id', 'productId'].includes(k)).map(([k, v]) => `${k}: ${typeof v === 'number' ? v.toFixed(2) : v}`).join(' | ');
            doc.fontSize(9).text(line, { width: 510 });
            doc.moveDown(0.6);
        }
        if (!rows.length)
            doc.text("Sin registros para este período.");
        if (data.summary) {
            doc.moveDown();
            doc.fontSize(11).text("Totales");
            for (const [k, v] of Object.entries(data.summary))
                if (typeof v === 'number')
                    doc.fontSize(10).text(`${k}: ${v.toFixed(2)}`);
        }
        doc.end();
    }
    catch (e) {
        next(e);
    }
}
