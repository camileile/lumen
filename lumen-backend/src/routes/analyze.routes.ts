import { Router } from "express";
import { analyzeController } from "../controllers/analyze.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const analyzeRoutes = Router();

analyzeRoutes.post("/", authMiddleware, analyzeController);

export default analyzeRoutes;