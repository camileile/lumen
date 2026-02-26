import { Router } from "express";
// Removido o 's' de controllers para bater com o nome da sua pasta
import { login, register } from "../controllers/auth.controller"; // Sem o 's'

const router = Router();

router.post("/login", login);
router.post("/register", register);

export default router;