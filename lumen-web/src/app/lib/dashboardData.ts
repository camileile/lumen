import type { DashboardData, HistoryResponse } from "./types";

export const NOT_ENOUGH_DATA_COPY = "Not enough data yet";
export const AUTOMATED_ESTIMATE_COPY =
  "Automated estimate based primarily on source/domain signals. Not a fact check.";

export function mapStatusLabel(
  status: string,
): DashboardData["statusLabel"] {
  if (status === "higher-signal") return "Faixa alta";
  if (status === "mixed-signal") return "Faixa intermediária";
  if (status === "lower-signal") return "Faixa baixa";
  return "Dados insuficientes";
}

function dateLabel(isoDate: string): string {
  const [, month, day] = isoDate.split("-");
  return month && day ? `${day}/${month}` : isoDate;
}

export function mapHistoryToDashboard(data: HistoryResponse): DashboardData {
  const hasData = data.items.length > 0;
  const scoreSeries = data.scoreHistory.map((point) => ({
    day: dateLabel(point.date),
    value: point.value,
  }));

  return {
    mascot: { name: "Lumen" },
    score: data.score,
    statusLabel: mapStatusLabel(data.status),
    statusHint: data.insight,
    xp: data.score ?? 0,
    scoreSeries,
    weeklySeries: scoreSeries.slice(-7),
    weeklyAverage: data.weeklyAverage,
    distribution: hasData
      ? [
          {
            label: "Categoria A — referência",
            value: data.distribution.confiavel,
            colorKey: "good",
          },
          {
            label: "Categoria B — neutra/desconhecida",
            value: data.distribution.neutro,
            colorKey: "neutral",
          },
          {
            label: "Categoria C — sinais sensacionalistas",
            value: data.distribution.sensacionalista,
            colorKey: "warn",
          },
          {
            label: "Categoria D — sinais de risco",
            value: data.distribution.desinformacao,
            colorKey: "bad",
          },
        ]
      : [],
    trend: {
      title: "Histórico observado",
      subtitle: data.scoreHistory.length < 2 ? NOT_ENOUGH_DATA_COPY : "Somente dias com observações reais",
    },
    insight: data.insight,
    lastAccess: data.items.slice(0, 5),
  };
}
