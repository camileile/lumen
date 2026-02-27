import { Router } from "express";
import { getHistory } from "../controllers/history.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

// ✅ com auth
router.get("/", authMiddleware, getHistory);

export default router;