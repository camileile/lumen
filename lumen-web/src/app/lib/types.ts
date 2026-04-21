export type LabelABCD = "A" | "B" | "C" | "D";
export type AnalyzeMode = "ai" | "local-fallback" | "local";

export type AccessItem = {
  id: string;
  url: string;
  title?: string;
  label: LabelABCD;
  score?: number;
  domain?: string;
  mode?: AnalyzeMode;
  createdAt?: string;
  category?: string;
};

export type ScorePoint = {
  date: string;
  value: number;
};

export type WeeklyPoint = {
  dia: string;
  value: number;
};

export type DistributionRaw = {
  confiavel: number;
  neutro: number;
  sensacionalista: number;
  desinformacao: number;
};

export type HistoryResponse = {
  items: AccessItem[];
  score: number;
  status: string;
  distribution: DistributionRaw;
  weeklyAverage: WeeklyPoint[];
  scoreHistory: ScorePoint[];
  insight: string;
};

export type DashboardData = {
  mascot: { name: string };

  score: number;
  statusLabel: "Iniciante" | "Saudável" | "Atenção" | "Crítico";
  statusHint: string;

  xp: number;

  scoreSeries: { day: string; value: number }[];
  weeklySeries: { day: string; value: number | null }[];

  distribution: {
    label: string;
    value: number;
    colorKey: "good" | "neutral" | "warn" | "bad";
  }[];

  trend: { title: string; subtitle: string };
  insight: string;

  lastAccess: AccessItem[];
};