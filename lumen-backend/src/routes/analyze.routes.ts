// src/routes/analyze.routes.ts
import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { analyzeController } from "../controllers/analyze.controller";

const router = Router();

// ✅ cast pra evitar conflito de generics do Express
router.post("/", authMiddleware as any, analyzeController as any);

export default router;