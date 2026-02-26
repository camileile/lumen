import { Router } from "express";
// Importando do caminho correto
import { getHistory } from "../controllers/history.controller"; // Sem o 's'

const router = Router();

router.get("/", getHistory);

export default router;