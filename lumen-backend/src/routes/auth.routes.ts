import { Router } from "express";
import { loginController, meController, registerController } from "../controllers/auth.controller";
import { validateBody } from "../middleware/validate.middleware";
import { loginSchema, registerSchema } from "../schemas/auth.schemas";
import { authMiddleware } from "../middleware/auth.middleware";
import { loginRateLimit, registerRateLimit } from "../middleware/rateLimit.middleware";

export const authRoutes = Router();

authRoutes.post("/register", registerRateLimit, validateBody(registerSchema), registerController);
authRoutes.post("/login", loginRateLimit, validateBody(loginSchema), loginController);
authRoutes.get("/me", authMiddleware, meController);
