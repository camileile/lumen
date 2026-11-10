import { Router } from "express";
import { deleteHistory, getHistory } from "../controllers/history.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/", authMiddleware, getHistory);
router.delete("/", authMiddleware, deleteHistory);

export default router;
