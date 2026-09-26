// src/routes/analyze.routes.ts
import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { analyzeController } from "../controllers/analyze.controller";
import { analyzeRateLimit } from "../middleware/rateLimit.middleware";

const router = Router();

router.post("/", authMiddleware, analyzeRateLimit, analyzeController);

export default router;
