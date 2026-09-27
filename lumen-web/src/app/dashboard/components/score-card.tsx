import { NOT_ENOUGH_DATA_COPY } from "@/app/lib/dashboardData";
import { SCORE_EXPLANATION_COPY } from "@/app/lib/ui";
import type { DashboardData } from "@/app/lib/types";
import { ChartDataTable, ScoreLine } from "./dashboard-charts";
import styles from "../dashboard.module.css";

export function ScoreCard({ data }: { data: DashboardData }) {
  return <section className={`${styles.card} ${styles.scoreCard}`} data-anchor="score" aria-labelledby="score-title">
    <div className={styles.scoreHeader}><h2 id="score-title">Estimativa informacional</h2></div>
    <p className={styles.scoreDisclosure}>{SCORE_EXPLANATION_COPY}</p>
    <div className={styles.scoreContent}>
      <div>
        <div className={styles.chartMock}>
          {data.scoreSeries.length === 0 ? <div className={styles.chartEmpty} role="status">
            <strong>{NOT_ENOUGH_DATA_COPY}</strong><span>Faça sua primeira análise para gerar uma estimativa.</span>
          </div> : <ScoreLine data={data.scoreSeries} showAxis />}
        </div>
        {data.scoreSeries.length > 0 && <ChartDataTable caption="Histórico real da estimativa" data={data.scoreSeries} />}
      </div>
      <div className={styles.scoreSide}>
        <div className={styles.scoreValue} aria-label={data.score === null ? "Score indisponível" : `Score ${data.score} de 100`}>{data.score ?? "—"}</div>
        <div className={styles.scoreLabel}>{data.statusLabel}</div>
        <div className={styles.scoreHint}>{data.statusHint}</div>
      </div>
    </div>
    <details className={styles.scoreDetails}><summary>Como interpretar</summary><p>{SCORE_EXPLANATION_COPY}</p></details>
  </section>;
}
