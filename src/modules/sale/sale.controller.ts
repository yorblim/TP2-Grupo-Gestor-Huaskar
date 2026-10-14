import { Request, Response, NextFunction } from "express";
import { getAllSales, getSaleById, createSale as createSaleService, deleteSale as deleteSaleService, cancelSale as cancelSaleService } from "./sale.service";
import { CreateSaleInput } from "./sale.types";
export async function getAllSalesHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await getAllSales(req.query as Record<string, any>);
        res.status(200).json({ success: true, ...result });
    }
    catch (error) {
        next(error);
    }
}
export async function getSaleByIdHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const id = req.params.id as string;
        const sale = await getSaleById(id);
        if (!sale) {
            res.status(404).json({ success: false, message: "Venta no encontrada." });
            return;
        }
        res.status(200).json({ success: true, data: sale });
    }
    catch (error) {
        next(error);
    }
}
export async function createSaleHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const data: CreateSaleInput = req.body;
        const sale = await createSaleService(data, req.user!.id);
        res.status(201).json({ success: true, data: sale });
    }
    catch (error) {
        next(error);
    }
}
export async function cancelSaleHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const id = req.params.id as string;
        const sale = await cancelSaleService(id, req.user!.id);
        if (!sale) {
            res.status(404).json({ success: false, message: "Venta no encontrada." });
            return;
        }
        res.status(200).json({ success: true, data: sale, message: "Venta anulada exitosamente." });
    }
    catch (error) {
        next(error);
    }
}
export async function deleteSaleHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const id = req.params.id as string;
        const deleted = await deleteSaleService(id);
        if (!deleted) {
            res.status(404).json({ success: false, message: "Venta no encontrada." });
            return;
        }
        res.status(200).json({ success: true, message: "Venta eliminada." });
    }
    catch (error) {
        next(error);
    }
}
