import { NOT_ENOUGH_DATA_COPY } from "@/app/lib/dashboardData";
import { CATEGORY_PRESENTATION } from "@/app/lib/ui";
import type { DashboardData } from "@/app/lib/types";
import { ChartDataTable, WeeklyBars } from "./dashboard-charts";
import styles from "../dashboard.module.css";

export function HistorySummaryCard({ data }: { data: DashboardData }) {
  const trend = data.trend;
  const available = trend.direction !== "insufficient";
  const direction = trend.direction === "up" ? "Subindo" : trend.direction === "down" ? "Descendo" : "Sem mudança";
  const symbol = trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→";
  return <section className={`${styles.card} ${styles.smallCard}`} aria-labelledby="history-summary-title">
    <h3 id="history-summary-title">Tendência</h3>
    {!available ? <div className={styles.miniEmpty} role="status"><span>Dados insuficientes para tendência</span></div> : <div className={styles.trendSummary}>
      <strong className={styles.trendDirection}><span aria-hidden="true">{symbol}</span> {direction}</strong>
      <span className={styles.trendDelta}>{trend.delta! > 0 ? "+" : ""}{trend.delta} pontos</span>
      <dl className={styles.trendValues}>
        <div><dt>Atual</dt><dd>{trend.currentAverage}</dd></div>
        <div><dt>Anterior</dt><dd>{trend.previousAverage}</dd></div>
      </dl>
    </div>}
  </section>;
}

export function WeeklyAverageCard({ data }: { data: DashboardData }) {
  return <section className={`${styles.card} ${styles.smallCard}`} aria-labelledby="weekly-title">
    <h3 id="weekly-title">Média semanal</h3>
    <div className={styles.weekValue} aria-label={data.weeklyAverage === null ? "Média indisponível" : `Média ${data.weeklyAverage}`}>{data.weeklyAverage ?? "—"}</div>
    {data.weeklySeries.length === 0 ? <div className={styles.miniEmpty} role="status"><span>{NOT_ENOUGH_DATA_COPY}</span></div> : <>
      <div className={styles.miniChart2}><WeeklyBars data={data.weeklySeries} /></div>
      <ChartDataTable caption="Semanas com observações reais" data={data.weeklySeries} />
    </>}
  </section>;
}

export function RecentSources({ data }: { data: DashboardData }) {
  return <section className={`${styles.card} ${styles.historyCard}`} data-anchor="history" aria-labelledby="recent-title">
    <h3 id="recent-title">Fontes observadas recentemente</h3>
    <div className={styles.historyList}>
      {data.lastAccess.length === 0 ? <div className={styles.emptyBox} role="status">
        <strong>Nenhuma análise ainda</strong><p>Quando a extensão analisar uma URL, a observação aparecerá aqui.</p>
      </div> : data.lastAccess.map((item) => <article key={item.id} className={styles.historyItem}>
        <div className={`${styles.letter} ${styles[`letter_${item.label}`]}`} aria-hidden="true">{item.label}</div>
        <div className={styles.historyText}>
          <strong className={styles.historyCategory}>{CATEGORY_PRESENTATION[item.label].label}</strong>
          <span className={styles.historyUrl}>{item.url}</span>
        </div>
      </article>)}
    </div>
  </section>;
}

export function HelpCard({ onOpenTutorial }: { onOpenTutorial: () => void }) {
  return <section className={`${styles.card} ${styles.actionsCard}`} data-anchor="actions" aria-labelledby="help-title">
    <h3 id="help-title">Ajuda</h3>
    <p className={styles.helpText}>Entenda o score, as categorias e os dados exibidos sem sair do dashboard.</p>
    <button className={styles.tourBtn} type="button" onClick={onOpenTutorial}>Abrir tutorial</button>
  </section>;
}
