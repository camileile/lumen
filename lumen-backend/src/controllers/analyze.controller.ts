import { Response } from "express";
import { AuthedRequest } from "../middleware/auth.middleware";
import prisma from "../db/prisma";

function classifyDomain(domain: string) {
  if (
    domain.includes("gov") ||
    domain.includes("who") ||
    domain.includes("bbc")
  )
    return { category: "confiavel", score: 85 };

  if (domain.includes("terra") || domain.includes("r7"))
    return { category: "sensacionalista", score: 45 };

  if (domain.includes("xyz") || domain.includes("alerta"))
    return { category: "desinformacao", score: 10 };

  return { category: "neutro", score: 60 };
}

export async function analyzeController(
  req: AuthedRequest,
  res: Response
) {
  try {
    const { url } = req.body;
    const userId = req.userId;

    if (!url) {
      return res.status(400).json({ error: "URL é obrigatória" });
    }

    if (!userId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const domain = new URL(url).hostname;

    const { category, score } = classifyDomain(domain);

    const summary = `O domínio ${domain} foi classificado como ${category}.`;

    // 🔥 AQUI ESTÁ O CREATE CORRETO
    const analysis = await prisma.analysis.create({
      data: {
        url,
        domain,
        category,
        score,
        summary,
        user: {
          connect: {
            id: userId,
          },
        },
      },
    });

    return res.json({ analysis });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao analisar URL" });
  }
}