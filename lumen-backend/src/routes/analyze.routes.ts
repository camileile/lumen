import { Router } from "express";
// Importe o controller da sua pasta de controllers
import { analyzeController } from "../controllers/analyze.controller"; // Sem o 's'

const router = Router();

router.post("/", analyzeController);

export default router;