// No seu src/routes/index.ts
import { Router } from "express";
import analyzeRoutes from "./analyze.routes";
import { authRoutes } from "./auth.routes";
import historyRoutes from "./history.routes";

const router = Router();

router.use("/analyze", analyzeRoutes);
router.use("/auth", authRoutes); // Isso cria o caminho /auth/...
router.use("/history", historyRoutes);

export default router;