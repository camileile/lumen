import { Router } from "express";
import prisma from "../db/prisma";
import { authMiddleware } from "../middleware/auth.middleware";

const r = Router();

r.get("/whoami", authMiddleware, async (req: any, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  res.json({ userId: req.userId, userExists: !!user, user });
});

export default r;