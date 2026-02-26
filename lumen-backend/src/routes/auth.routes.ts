import { Router } from "express";
import { loginController, meController, registerController } from "../controllers/auth.controller";
import { validateBody } from "../middleware/validate.middleware";
import { loginSchema, registerSchema } from "../schemas/auth.schemas";
import { authMiddleware } from "../middleware/auth.middleware";

export const authRoutes = Router();

authRoutes.post("/register", validateBody(registerSchema), registerController);
authRoutes.post("/login", validateBody(loginSchema), loginController);
authRoutes.get("/me", authMiddleware, meController);