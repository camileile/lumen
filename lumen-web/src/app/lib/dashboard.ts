import type { DashboardData } from "./types";
import type { AnalysisItem } from "./history";
import { normalizeLabel } from "./history";

type LabelABCD = "A" | "B" | "C" | "D";

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function dayKeyISO(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dayLabelBR(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function labelToText(label: LabelABCD) {
  if (label === "A") return "Confiável";
  if (label === "B") return "Neutro";
  if (label === "C") return "Sensacionalista";
  return "Desinformação";
}

function labelToColorKey(label: LabelABCD): "good" | "neutral" | "warn" | "bad" {
  if (label === "A") return "good";
  if (label === "B") return "neutral";
  if (label === "C") return "warn";
  return "bad";
}

function statusFromScore(score: number): DashboardData["statusLabel"] {
  if (score >= 70) return "Saudável";
  if (score >= 40) return "Atenção";
  if (score > 0) return "Crítico";
  return "Iniciante";
}

function statusHint(label: DashboardData["statusLabel"]) {
  if (label === "Saudável") return "Você está consumindo majoritariamente fontes equilibradas.";
  if (label === "Atenção") return "Seu consumo está oscilando. Prefira fontes confiáveis e neutras.";
  if (label === "Crítico") return "Alerta: muitas visitas a fontes de baixa confiabilidade no consumo.";
  return "Faça sua primeira análise para ver sua evolução.";
}

// Estilo demo: frase curta, “redutivo” e com tom produto
function buildInsight(dist: Record<LabelABCD, number>, total: number) {
  if (!total) return "Comece analisando algumas URLs para gerar seu perfil informacional.";

  const pct = (k: LabelABCD) => Math.round((dist[k] / total) * 100);

  const c = pct("C");
  const d = pct("D");
  const a = pct("A");
  const b = pct("B");

  if (a + b >= 70) return "Seu padrão informacional está mais estável e consciente.";
  if (d >= 15)
    return "Há sinais de risco: presença relevante de fontes de desinformação. Foque em fontes confiáveis/neutras por alguns dias.";
  if (c >= 25)
    return "Você tem consumido bastante conteúdo sensacionalista. Reduzir isso tende a melhorar o equilíbrio do seu score.";
  return "Seu consumo está misto. Priorize fontes confiáveis e neutras para estabilizar o score.";
}

export function buildDashboardFromHistory(items: AnalysisItem[], mascotName = "Lumen"): DashboardData {
  const sorted = [...(items || [])].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
  const last = sorted[sorted.length - 1];

  const scoreNow = last?.score ?? 0;
  const statusLabel = statusFromScore(scoreNow);

  // XP (demo-like): cresce com volume + score
  const xp = clamp(Math.round((sorted.length / 35) * 55 + (scoreNow / 100) * 45), 0, 100);

  // série diária (média do dia)
  const byDay = new Map<string, { sum: number; count: number }>();
  for (const it of sorted) {
    const k = dayKeyISO(new Date(it.createdAt));
    const cur = byDay.get(k) || { sum: 0, count: 0 };
    cur.sum += Number(it.score ?? 0);
    cur.count += 1;
    byDay.set(k, cur);
  }
  const dayKeys = Array.from(byDay.keys()).sort();

  const scoreSeries = dayKeys.map((k) => {
    const v = byDay.get(k)!;
    return { day: dayLabelBR(k), value: Math.round(v.sum / v.count) };
  });

  // ✅ weeklySeries (últimos 7 dias) SEM inventar valores:
  // dia sem dado = null
  const weeklySeries: { day: string; value: number | null }[] = [];
  if (dayKeys.length) {
    const lastDate = new Date(dayKeys[dayKeys.length - 1] + "T00:00:00");

    for (let i = 6; i >= 0; i--) {
      const d = new Date(lastDate);
      d.setDate(lastDate.getDate() - i);
      const key = dayKeyISO(d);

      const entry = byDay.get(key);
      weeklySeries.push({
        day: dayLabelBR(key),
        value: entry ? Math.round(entry.sum / entry.count) : null,
      });
    }
  }

  // Distribuição A/B/C/D
  const dist: Record<LabelABCD, number> = { A: 0, B: 0, C: 0, D: 0 };
  for (const it of sorted) dist[normalizeLabel(it) as LabelABCD]++;

  const total = sorted.length || 1;

  // ✅ igual demo: label é TEXTO
  const distribution = (["A", "B", "C", "D"] as LabelABCD[]).map((l) => ({
    label: labelToText(l),
    value: Math.round((dist[l] / total) * 100),
    colorKey: labelToColorKey(l),
  }));

  // Tendência demo-like (ignora dias null)
  const vals = weeklySeries.map((x) => x.value).filter((v): v is number => typeof v === "number");
  const lastWeekAvg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;

  const trend =
    lastWeekAvg == null
      ? { title: "Tendência", subtitle: "Sem dados suficientes" }
      : lastWeekAvg >= 70
      ? { title: "Tendência", subtitle: "↗ Consumo mais crítico e equilibrado" }
      : lastWeekAvg >= 40
      ? { title: "Tendência", subtitle: "↗ Consumo em ajuste" }
      : { title: "Tendência", subtitle: "↘ Consumo mais crítico" };

  // ✅ Últimos acessos igual demo: só 5 itens
  const lastAccess = [...sorted]
    .slice(-5)
    .reverse()
    .map((it) => ({
      id: it.id,
      url: it.url,
      label: normalizeLabel(it) as any,
      title: "",
    }));

  return {
    mascot: { name: mascotName },

    score: scoreNow,
    statusLabel,
    statusHint: statusHint(statusLabel),

    xp,

    scoreSeries,
    weeklySeries: weeklySeries as any, // 👈 se seu type ainda for number, ajuste types.ts (veja abaixo)

    distribution,

    trend,
    insight: buildInsight(dist, sorted.length),

    lastAccess,
  };
}