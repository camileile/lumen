import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { analyzeController } from "../controllers/analyze.controller";

const router = Router();

router.post("/", authMiddleware, analyzeController);

export default router;