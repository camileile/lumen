export type AccessItem = {
  id: string;
  url: string;
  title: string;
  label: "A" | "B" | "C" | "D";
};

export type DashboardData = {
  user: { name: string };
  score: number;
  statusLabel: "Iniciante" | "Saudável" | "Atenção" | "Crítico"; // Adicionei 'Iniciante'
  statusHint: string;
  xp: number;
  scoreSeries: { day: string; value: number }[];
  weeklySeries: { day: string; value: number }[];
  distribution: { label: string; value: number; colorKey: "good" | "neutral" | "warn" | "bad" }[];
  trend: { title: string; subtitle: string };
  insight: string;
  lastAccess: AccessItem[];
};

export function getDashboardMock(firstTime = false): DashboardData {
  if (firstTime) {
    return {
      user: { name: "Lumen" },
      score: 0,
      statusLabel: "Iniciante", // Alterado de Atenção para Iniciante
      statusHint: "Comece analisando uma URL para gerar seu primeiro score.",
      xp: 0, // ✅ CORRIGIDO: Agora começa em 0%
      scoreSeries: [],
      weeklySeries: [],
      distribution: [],
      trend: { title: "Tendência", subtitle: "Sem dados ainda" },
      insight: "Bem-vindo(a)! Assim que você analisar sites, o Lumen vai montar seus gráficos.",
      lastAccess: [],
    };
  }

  // MOCK COM DADOS (Robertin)
  return {
    user: { name: "Robertin" },
    score: 82,
    statusLabel: "Saudável",
    statusHint: "Seu consumo informacional está equilibrado.",
    xp: 64,
    scoreSeries: [
      { day: "seg", value: 12 },
      { day: "ter", value: 18 },
      { day: "qua", value: 28 },
      { day: "qui", value: 28 },
      { day: "sex", value: 28 },
      { day: "sáb", value: 32 },
      { day: "dom", value: 40 },
    ],
    weeklySeries: [
      { day: "seg", value: 10 },
      { day: "ter", value: 16 },
      { day: "qua", value: 24 },
      { day: "qui", value: 24 },
      { day: "sex", value: 24 },
      { day: "sáb", value: 30 },
      { day: "dom", value: 38 },
    ],
    distribution: [
      { label: "Confiável", value: 50, colorKey: "good" },
      { label: "Neutro", value: 30, colorKey: "neutral" },
      { label: "Sensacionalista", value: 15, colorKey: "warn" },
      { label: "Desinformação", value: 5, colorKey: "bad" },
    ],
    trend: { title: "Tendência", subtitle: "Melhorando" },
    insight: "Você consumiu 35% mais fontes confiáveis que na semana passada. Continue assim!",
    lastAccess: [
      { id: "1", label: "A", title: "noticias-base-e-confiaveis", url: "siteconfiavel.com.br/noticias-base-e-confiaveis" },
      { id: "2", label: "A", title: "clima-atualizado", url: "fontanarede.org.br/estudo/clima-atualizado" },
      { id: "3", label: "B", title: "tecnologia-tendencias", url: "noticiasgerais.net/tecnologia-e-tendencias-da-semana" },
      { id: "4", label: "C", title: "fica-rico-sem-sair-do-sofa", url: "siteduvidoso.com.br/como-ficar-rico-sem-sair-do-sofa" },
      { id: "5", label: "D", title: "vacina-autismo", url: "urgenteagora24h/crianca-desenvolve-autismo-apos-vacina" },
    ],
  };
}