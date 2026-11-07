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

export type DistributionRaw = {
  confiavel: number;
  neutro: number;
  sensacionalista: number;
  desinformacao: number;
};

export type HistoryResponse = {
  items: AccessItem[];
  score: number | null;
  status: string;
  distribution: DistributionRaw;
  weeklyAverage: number | null;
  scoreHistory: ScorePoint[];
  weeklyAverages: Array<{
    week: string;
    label: string;
    startDate: string;
    endDate: string;
    value: number;
    observedDays: number;
  }>;
  trend: {
    direction: "up" | "down" | "flat" | "insufficient";
    delta: number | null;
    currentAverage: number | null;
    previousAverage: number | null;
  };
  insight: string;
  methodology: {
    version: string;
    observationWindow: number;
    basis: string;
  };
};

export type DashboardData = {
  mascot: { name: string };

  score: number | null;
  statusLabel: "Dados insuficientes" | "Faixa alta" | "Faixa intermediária" | "Faixa baixa";
  statusHint: string;

  xp: number;

  scoreSeries: { day: string; value: number }[];
  weeklySeries: Array<{ day: string; value: number; observedDays: number }>;
  weeklyAverage: number | null;

  distribution: {
    label: string;
    value: number;
    colorKey: "good" | "neutral" | "warn" | "bad";
  }[];

  trend: HistoryResponse["trend"];
  insight: string;

  lastAccess: AccessItem[];
};
