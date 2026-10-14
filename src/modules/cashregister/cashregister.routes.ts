import { Router } from "express";
import { openSessionHandler, closeSessionHandler, getActiveSessionHandler, getSessionsHandler, } from "./cashregister.controller";
import { authMiddleware, requireRole } from "../../middlewares/auth.middleware";
import { auditMiddleware } from "../../middlewares/audit.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { openSessionSchema, closeSessionSchema } from "./cashregister.validation";
import { addCashMovement, getCashMovements } from "./cashregister.service";
const cashregisterRouter = Router();
cashregisterRouter.post("/:id/movements", async (req, res, next) => { try {
    res.status(201).json({ success: true, data: await addCashMovement(req.params.id as string, req.user!.id, req.body) });
}
catch (e) {
    next(e);
} });
cashregisterRouter.get("/:id/movements", async (req, res, next) => { try {
    res.json({ success: true, data: await getCashMovements(req.params.id as string, req.user!.id) });
}
catch (e) {
    next(e);
} });
cashregisterRouter.post("/open", authMiddleware, requireRole("ADMIN", "CAJERO"), validate(openSessionSchema), openSessionHandler);
cashregisterRouter.post("/:id/close", authMiddleware, requireRole("ADMIN", "CAJERO"), validate(closeSessionSchema), closeSessionHandler);
cashregisterRouter.get("/active", authMiddleware, getActiveSessionHandler);
cashregisterRouter.get("/", authMiddleware, getSessionsHandler);
export default cashregisterRouter;
