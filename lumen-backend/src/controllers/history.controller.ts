import { Response } from "express";
import prisma from "../db/prisma";
import { AuthedRequest } from "../middleware/auth.middleware";

export async function getHistory(req: AuthedRequest, res: Response) {
  try {
    if (!req.userId) return res.status(401).json({ error: "Não autenticado" });

    const items = await prisma.analysis.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // ✅ o front espera { items: [...] }
    return res.json({ items });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e?.message || "Erro ao buscar histórico" });
  }
}