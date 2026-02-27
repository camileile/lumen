import type { DashboardData } from "./types";
import type { AnalysisItem } from "./history";

const pesos = { A: 3, B: 1, C: -2, D: -5 } as const;

function catToLabel(it: AnalysisItem): "A" | "B" | "C" | "D" {
  if (it.label) return it.label;
  const c = String(it.category || "").toLowerCase();
  if (c === "confiavel") return "A";
  if (c === "neutro") return "B";
  if (c === "sensacionalista") return "C";
  if (c === "desinformacao") return "D";
  return "B";
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function scoreFromPesos(ps: number[]) {
  if (!ps.length) return 0;
  const soma = ps.reduce((x, y) => x + y, 0);
  const media = soma / ps.length;
  return clamp(Math.round(((media + 5) / 8) * 100), 0, 100);
}

function statusFromScore(score: number): DashboardData["statusLabel"] {
  if (score >= 70) return "Saudável";
  if (score >= 40) return "Atenção";
  if (score > 0) return "Iniciante";
  return "Iniciante";
}

function hintFromScore(score: number) {
  if (score >= 70) return "Você está consumindo majoritariamente fontes equilibradas.";
  if (score >= 40) return "Seu consumo está misto — tente priorizar fontes mais confiáveis.";
  if (score > 0) return "Bom começo! Continue analisando URLs para melhorar seu padrão informacional.";
  return "Comece analisando uma URL para gerar seu primeiro score.";
}

function dayKey(d: Date) {
  const map = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  return map[d.getDay()];
}

export function buildDashboardFromHistory(items: AnalysisItem[], mascotName = "Lumen"): DashboardData {
  const ordered = [...items].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
  const last20 = ordered.slice(-20);

  const ps = last20.map((it) => pesos[catToLabel(it)]);
  const score = scoreFromPesos(ps);

  const xp = clamp(last20.length * 2 + ps.filter((p) => p > 0).length, 0, 9999);

  const counts = { A: 0, B: 0, C: 0, D: 0 };
  for (const it of last20) counts[catToLabel(it)]++;

  const total = Math.max(1, last20.length);
  const distribution: DashboardData["distribution"] = [
    { label: "Confiável", value: Math.round((counts.A / total) * 100), colorKey: "good" },
    { label: "Neutro", value: Math.round((counts.B / total) * 100), colorKey: "neutral" },
    { label: "Sensacionalista", value: Math.round((counts.C / total) * 100), colorKey: "warn" },
    { label: "Desinformação", value: Math.round((counts.D / total) * 100), colorKey: "bad" },
  ];

  const now = new Date();
  const days: Date[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push(d);
  }

  const scoreSeries = days.map((d) => {
    const start = new Date(d).getTime();
    const end = new Date(d); end.setHours(23, 59, 59, 999);

    const daily = ordered.filter((it) => {
      const t = new Date(it.createdAt).getTime();
      return t >= start && t <= end.getTime();
    });

    const dailyPs = daily.slice(-20).map((it) => pesos[catToLabel(it)]);
    const value = dailyPs.length ? scoreFromPesos(dailyPs) : 0;

    return { day: dayKey(d), value };
  });

  const weeklySeries = scoreSeries;

  const lastAccess = [...items]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 5)
    .map((it) => ({
      id: it.id,
      url: it.url,
      title: it.domain || it.url,
      label: catToLabel(it),
    }));

  const statusLabel = statusFromScore(score);
  const statusHint = hintFromScore(score);

  const trend = {
    title: "Tendência",
    subtitle: score >= 70 ? "Consumo mais crítico e equilibrado" : score >= 40 ? "Oscilando — ajuste suas fontes" : "Construindo hábito informacional",
  };

  const insight =
    score >= 70
      ? "Seu padrão informacional está mais estável e consciente."
      : score >= 40
      ? "Você pode ganhar estabilidade priorizando fontes confiáveis e checadas."
      : "Bem-vindo(a)! Assim que você analisar sites, o Lumen vai montar seus gráficos.";

  return {
    mascot: { name: mascotName },
    score,
    statusLabel,
    statusHint,
    xp,
    scoreSeries,
    weeklySeries,
    distribution,
    trend,
    insight,
    lastAccess,
  };
}