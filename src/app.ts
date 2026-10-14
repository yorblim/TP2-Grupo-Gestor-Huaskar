import cors from "cors";
import express from "express";
import path from "path";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import router from "./routes";
import { errorMiddleware } from "./middlewares/error.middleware";
import { setupSwagger } from "./swagger";
const app = express();
app.set("trust proxy", "loopback, linklocal, uniquelocal");
app.use(helmet());
app.use(cookieParser());
if (env.NODE_ENV === "production") {
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 200,
        standardHeaders: true,
        legacyHeaders: false,
        message: { success: false, message: "Demasiadas solicitudes. Intenta de nuevo en 15 minutos." },
    });
    app.use("/api", limiter);
}
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos." },
});
app.use("/api/auth/login", authLimiter);
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
            return callback(null, true);
        }
        if (env.CORS_ORIGIN) {
            const allowed = env.CORS_ORIGIN.split(",").map((o) => o.trim());
            if (allowed.includes(origin)) {
                return callback(null, true);
            }
        }
        return callback(new Error("Origen no permitido por CORS."));
    },
    credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.get("/health", (_req, res) => {
    res.status(200).json({
        success: true,
        message: "OK",
        environment: env.NODE_ENV,
    });
});
setupSwagger(app);
app.use("/api", router);
app.use(errorMiddleware);
export default app;
