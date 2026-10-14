import { Request, Response, NextFunction } from "express";
import { openSession, closeSession, getActiveSession, getSessions } from "./cashregister.service";
export async function openSessionHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.id;
        const session = await openSession(userId, req.body);
        res.status(201).json({ success: true, data: session });
    }
    catch (error) {
        next(error);
    }
}
export async function closeSessionHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const id = req.params.id as string;
        const userId = req.user!.id;
        const session = await closeSession(id, userId, req.body);
        res.status(200).json({ success: true, data: session });
    }
    catch (error) {
        next(error);
    }
}
export async function getActiveSessionHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const session = await getActiveSession(req.user!.id);
        res.status(200).json({ success: true, data: session });
    }
    catch (error) {
        next(error);
    }
}
export async function getSessionsHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const result = await getSessions(req.query as Record<string, any>, req.user!.role === "ADMIN" ? undefined : req.user!.id);
        res.status(200).json({ success: true, ...result });
    }
    catch (error) {
        next(error);
    }
}
