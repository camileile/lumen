import { Response } from "express";
import prisma from "../db/prisma";
import { AuthedRequest } from "../middleware/auth.middleware";

type LabelABCD = "A" | "B" | "C" | "D";

function normalizeLabelFromAnalysis(a: any): LabelABCD {
  if (a.label === "A" || a.label === "B" || a.label === "C" || a.label === "D") {
    return a.label;
  }

  if (a.category === "A" || a.category === "B" || a.category === "C" || a.category === "D") {
    return a.category;
  }

  const c = String(a.category || "").toLowerCase().trim();

  if (c === "confiavel") return "A";
  if (c === "neutro" || c === "desconhecido") return "B";
  if (c === "sensacionalista") return "C";
  if (c === "desinformacao") return "D";

  return "B";
}

export async function getHistory(req: AuthedRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    const items = await prisma.analysis.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const normalized = items.map((a) => ({
      ...a,
      label: normalizeLabelFromAnalysis(a),
    }));

    const counts: Record<LabelABCD, number> = {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
    };

    normalized.forEach((item) => {
      counts[item.label]++;
    });

    const total = normalized.length || 1;

    const distribution = {
      confiavel: Math.round((counts.A / total) * 100),
      neutro: Math.round((counts.B / total) * 100),
      sensacionalista: Math.round((counts.C / total) * 100),
      desinformacao: Math.round((counts.D / total) * 100),
    };

    const rawScore =
      counts.A * 100 +
      counts.B * 70 +
      counts.C * 30 +
      counts.D * 10;

    const score = Math.round(rawScore / total);

    const baseScore = Math.max(0, Math.min(score, 100));

    const scoreHistory = Array.from({ length: 7 }).map((_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (6 - i));

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");

  return {
    date: `${day}/${month}`,
    value: Math.max(0, Math.min(100, baseScore - (6 - i))),
  };
});

    const weeklyAverage = [
      { dia: "seg", value: Math.max(0, Math.min(100, baseScore - 6)) },
      { dia: "ter", value: Math.max(0, Math.min(100, baseScore - 5)) },
      { dia: "qua", value: Math.max(0, Math.min(100, baseScore - 4)) },
      { dia: "qui", value: Math.max(0, Math.min(100, baseScore - 3)) },
      { dia: "sex", value: Math.max(0, Math.min(100, baseScore - 2)) },
      { dia: "sab", value: Math.max(0, Math.min(100, baseScore - 1)) },
      { dia: "dom", value: baseScore },
    ];

    let insight = "Seu padrão informacional pode melhorar.";
    let status = "Neutro";

    if (distribution.confiavel >= 50) {
      insight = "Você está consumindo majoritariamente fontes equilibradas.";
      status = "Saudável";
    } else if (distribution.desinformacao >= 20) {
      insight = "Seu consumo recente inclui muitas fontes duvidosas.";
      status = "Alerta";
    } else if (distribution.sensacionalista >= 20) {
      insight = "Você tem consumido conteúdo mais sensacionalista recentemente.";
      status = "Atenção";
    }

    
    return res.json({
      items: normalized,
      score: baseScore,
      status,
      distribution,
      weeklyAverage,
      scoreHistory,
      insight,
    });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e?.message || "Erro ao buscar histórico" });
  }
}