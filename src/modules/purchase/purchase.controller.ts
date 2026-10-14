import { Request, Response, NextFunction } from "express";
import { createPurchaseOrder, getAllPurchaseOrders, getPurchaseOrderById, receivePurchaseOrder, cancelPurchaseOrder } from "./purchase.service";
export const purchaseController = {
    getAll: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await getAllPurchaseOrders(req.query as Record<string, any>);
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    },
    getById: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const order = await getPurchaseOrderById(id);
            if (!order) {
                res.status(404).json({ success: false, message: "Orden de compra no encontrada" });
                return;
            }
            res.json({ success: true, data: order });
        }
        catch (error) {
            next(error);
        }
    },
    create: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const order = await createPurchaseOrder(req.body);
            res.status(201).json({ success: true, data: order });
        }
        catch (error) {
            next(error);
        }
    },
    receive: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const order = await receivePurchaseOrder(id, req.user!.id);
            if (!order) {
                res.status(404).json({ success: false, message: "Orden de compra no encontrada" });
                return;
            }
            res.json({ success: true, data: order });
        }
        catch (error) {
            next(error);
        }
    },
    cancel: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const order = await cancelPurchaseOrder(id);
            if (!order) {
                res.status(404).json({ success: false, message: "Orden de compra no encontrada" });
                return;
            }
            res.json({ success: true, data: order });
        }
        catch (error) {
            next(error);
        }
    },
};
