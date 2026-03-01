import { Response } from "express";
import prisma from "../db/prisma";
import { AuthedRequest } from "../middleware/auth.middleware";

type LabelABCD = "A" | "B" | "C" | "D";

function normalizeLabelFromAnalysis(a: any): LabelABCD {
  // 1) se já tem label
  if (a.label === "A" || a.label === "B" || a.label === "C" || a.label === "D") return a.label;

  // 2) às vezes category já é A/B/C/D
  if (a.category === "A" || a.category === "B" || a.category === "C" || a.category === "D") return a.category;

  // 3) legacy text
  const c = String(a.category || "").toLowerCase().trim();
  if (c === "confiavel") return "A";
  if (c === "neutro" || c === "desconhecido") return "B";
  if (c === "sensacionalista") return "C";
  if (c === "desinformacao") return "D";

  return "B";
}

export async function getHistory(req: AuthedRequest, res: Response) {
  try {
    if (!req.userId) return res.status(401).json({ error: "Não autenticado" });

    const items = await prisma.analysis.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const normalized = items.map((a) => ({
      ...a,
      label: normalizeLabelFromAnalysis(a), // ✅ sempre presente pro front
    }));

    return res.json({ items: normalized });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e?.message || "Erro ao buscar histórico" });
  }
}