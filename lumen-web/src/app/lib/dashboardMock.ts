export type AccessItem = {
  id: string;
  url: string;
  title: string;
  label: "A" | "B" | "C" | "D";
};

export type DashboardData = {
  user: { name: string };
  score: number;
  statusLabel: "Iniciante" | "Saudável" | "Atenção" | "Crítico";
  statusHint: string;
  xp: number;
  scoreSeries: { day: string; value: number }[];
  weeklySeries: { day: string; value: number }[];
  distribution: {
    label: string;
    value: number;
    colorKey: "good" | "neutral" | "warn" | "bad";
  }[];
  trend: { title: string; subtitle: string };
  insight: string;
  lastAccess: AccessItem[];
};

export function getDashboardMock(firstTime = false): DashboardData {
  if (firstTime) {
    return {
      user: { name: "Lumen" },
      score: 0,
      statusLabel: "Iniciante",
      statusHint: "Comece analisando uma URL para gerar seu primeiro score.",
      xp: 0,
      scoreSeries: [],
      weeklySeries: [],
      distribution: [],
      trend: { title: "Tendência", subtitle: "Sem dados ainda" },
      insight:
        "Bem-vindo(a)! Assim que você analisar sites, o Lumen vai montar seus gráficos.",
      lastAccess: [],
    };
  }

  // DADOS MOCK (com variação realista 0–100)
  return {
    user: { name: "Robertin" },
    score: 74,
    statusLabel: "Saudável",
    statusHint: "Você está consumindo majoritariamente fontes equilibradas.",
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
      { day: "seg", value: 52 },
      { day: "ter", value: 57 },
      { day: "qua", value: 63 },
      { day: "qui", value: 68 },
      { day: "sex", value: 72 },
      { day: "sáb", value: 78 },
      { day: "dom", value: 74 },
    ],

    distribution: [
      { label: "Confiável", value: 42, colorKey: "good" },
      { label: "Neutro", value: 33, colorKey: "neutral" },
      { label: "Sensacionalista", value: 18, colorKey: "warn" },
      { label: "Desinformação", value: 7, colorKey: "bad" },
    ],

    trend: {
      title: "Tendência",
      subtitle: "Consumo mais crítico e equilibrado",
    },

    insight:
      "Você reduziu 12% o consumo de fontes sensacionalistas nos últimos 7 dias. Seu padrão informacional está mais estável e consciente.",

    lastAccess: [
      {
        id: "1",
        label: "A",
        title: "Relatório econômico anual",
        url: "economiaoficial.gov.br/relatorio-anual-2025",
      },
      {
        id: "2",
        label: "A",
        title: "Atualização climática global",
        url: "climatecenter.org/atualizacao-global",
      },
      {
        id: "3",
        label: "B",
        title: "Tendências de tecnologia 2026",
        url: "techinsight.net/tendencias-2026",
      },
      {
        id: "4",
        label: "C",
        title: "Método secreto para enriquecer em 7 dias",
        url: "superviral24h.com/metodo-secreto",
      },
      {
        id: "5",
        label: "D",
        title: "Teoria conspiratória viral da semana",
        url: "alertamaximo.xyz/conspiracao-viral",
      },
    ],
  };
}