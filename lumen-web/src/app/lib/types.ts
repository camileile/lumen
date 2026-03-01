export type LabelABCD = "A" | "B" | "C" | "D";
export type AnalyzeMode = "ai" | "local-fallback" | "local";

export type AccessItem = {
  id: string;
  url: string;
  title?: string; // opcional (nem sempre você tem)
  label: LabelABCD;

  // ✅ novos (pra UI ficar unificada)
  score?: number;
  domain?: string;
  mode?: AnalyzeMode;
};

export type DashboardData = {
  mascot: { name: string };

  score: number;
  statusLabel: "Iniciante" | "Saudável" | "Atenção" | "Crítico";
  statusHint: string;

  xp: number;

  scoreSeries: { day: string; value: number }[];
  weeklySeries: { day: string; value: number | null }[]; // ✅ aqui

  distribution: {
    label: string;
    value: number; // %
    colorKey: "good" | "neutral" | "warn" | "bad";
  }[];

  trend: { title: string; subtitle: string };
  insight: string;

  lastAccess: AccessItem[];
};