import type { DashboardData } from "./types";

export function getDashboardMock(firstTime = false): DashboardData {
  if (firstTime) {
    return {
      mascot: { name: "Lumen" },
      score: null,
      statusLabel: "Dados insuficientes",
      statusHint: "Not enough data yet. Faça uma análise para gerar a primeira estimativa.",
      xp: 0,
      scoreSeries: [],
      weeklySeries: [],
      weeklyAverage: null,
      distribution: [],
      trend: { direction: "insufficient", delta: null, currentAverage: null, previousAverage: null },
      insight: "Bem-vindo(a)! Assim que você analisar sites, o Lumen vai montar seus gráficos.",
      lastAccess: [],
    };
  }

  return {
    mascot: { name: "Robertin" },
    score: 74,
    statusLabel: "Faixa alta",
    statusHint: "Exemplo de estimativa automatizada; não representa checagem factual.",
    xp: 58,
    scoreSeries: [
      { day: "seg", value: 58 },
      { day: "ter", value: 64 },
      { day: "qua", value: 71 },
      { day: "qui", value: 69 },
      { day: "sex", value: 74 },
      { day: "sáb", value: 81 },
      { day: "dom", value: 74 },
    ],
    weeklySeries: [
      { day: "Semana 35", value: 64, observedDays: 4 },
      { day: "Semana 36", value: 68, observedDays: 5 },
      { day: "Semana 37", value: 71, observedDays: 3 },
      { day: "Semana 38", value: 74, observedDays: 2 },
    ],
    weeklyAverage: 74,
    distribution: [
      { label: "Categoria A — referência", value: 42, colorKey: "good" },
      { label: "Categoria B — neutra/desconhecida", value: 33, colorKey: "neutral" },
      { label: "Categoria C — sinais sensacionalistas", value: 18, colorKey: "warn" },
      { label: "Categoria D — sinais de risco", value: 7, colorKey: "bad" },
    ],
    trend: { direction: "up", delta: 3, currentAverage: 74, previousAverage: 71 },
    insight: "Exemplo demonstrativo. Estes valores não representam observações reais do usuário.",
    lastAccess: [
      { id: "1", label: "A", title: "Relatório econômico anual", url: "economiaoficial.gov.br/relatorio-anual-2025" },
      { id: "2", label: "A", title: "Atualização climática global", url: "climatecenter.org/atualizacao-global" },
      { id: "3", label: "B", title: "Tendências de tecnologia 2026", url: "techinsight.net/tendencias-2026" },
      { id: "4", label: "C", title: "Método secreto para enriquecer em 7 dias", url: "superviral24h.com/metodo-secreto" },
      { id: "5", label: "D", title: "Teoria conspiratória viral da semana", url: "alertamaximo.xyz/conspiracao-viral" },
    ],
  };
}
