import { Request, Response, NextFunction } from "express";
import { createMovement, getAllMovements, getMovementById, getMovementsByProductId } from "./inventory.service";
export const inventoryController = {
    getAll: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await getAllMovements(req.query as Record<string, any>);
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    },
    getById: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const movement = await getMovementById(id);
            if (!movement) {
                res.status(404).json({ success: false, message: "Movimiento no encontrado" });
                return;
            }
            res.json({ success: true, data: movement });
        }
        catch (error) {
            next(error);
        }
    },
    getByProduct: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const productId = req.params.productId as string;
            const movements = await getMovementsByProductId(productId);
            res.json({ success: true, data: movements });
        }
        catch (error) {
            next(error);
        }
    },
    create: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const movement = await createMovement(req.body, req.user!.id);
            res.status(201).json({ success: true, data: movement });
        }
        catch (error) {
            next(error);
        }
    },
};
