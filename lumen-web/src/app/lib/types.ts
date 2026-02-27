export type AccessItem = {
  id: string;
  url: string;
  title: string;
  label: "A" | "B" | "C" | "D";
};

export type DashboardData = {
  mascot: { name: string };
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