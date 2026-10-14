import { Request, Response, NextFunction } from "express";
import { AppError } from "../../utils/AppError";
import { getReceiptText } from "./print.service";
export async function getReceiptHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const text = await getReceiptText(req.params.id as string);
        const safe = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        res.type("html").send(`<!doctype html><html lang="es"><meta charset="utf-8"><title>Ticket interno Huaskar</title><style>body{margin:16px;font-family:monospace}pre{white-space:pre-wrap;width:80mm}button{padding:8px 16px}@media print{button{display:none}body{margin:0}}</style><button onclick="window.print()">Imprimir ticket</button><pre>${safe}</pre></html>`);
    }
    catch (error: unknown) {
        if (error instanceof AppError && error.statusCode === 404) {
            res.status(404).json({ success: false, message: error.message });
            return;
        }
        next(error);
    }
}
