import { Router } from "express";
import analyzeRoutes from "./analyze.routes";
import { authRoutes } from "./auth.routes";
import historyRoutes from "./history.routes";

const router = Router();

router.use("/analyze", analyzeRoutes);
router.use("/auth", authRoutes);
router.use("/history", historyRoutes);

export default router;