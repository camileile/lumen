import { CATEGORY_PRESENTATION } from "@/app/lib/ui";
import type { DashboardData, LabelABCD } from "@/app/lib/types";
import styles from "../dashboard.module.css";

const letters: LabelABCD[] = ["A", "B", "C", "D"];

export function DistributionCard({ distribution }: { distribution: DashboardData["distribution"] }) {
  return <section className={`${styles.card} ${styles.smallCard}`} data-anchor="distribution" aria-labelledby="distribution-title">
    <h3 id="distribution-title">Distribuição A/B/C/D</h3>
    {distribution.length === 0 ? <div className={styles.placeholderBox} role="status">
      <strong>Sem dados de distribuição</strong><p>Analise algumas URLs para ver as categorias observadas.</p>
    </div> : <div className={styles.bars}>
      {distribution.map((item, index) => {
        const category = letters[index];
        return <div key={item.label} className={styles.barRow}>
          <span><strong>{category}</strong> — {CATEGORY_PRESENTATION[category].label.replace(`Categoria ${category} — `, "")}</span>
          <div className={styles.barTrack} role="progressbar" aria-label={`${CATEGORY_PRESENTATION[category].label}: ${item.value}%`}
            aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.value}>
            <div className={`${styles.barFill} ${styles[`bar_${item.colorKey}`]}`} style={{ width: `${item.value}%` }} />
          </div>
          <span className={styles.barValue}>{item.value}%</span>
        </div>;
      })}
    </div>}
    <details className={styles.categoryDetails}><summary>O que significam as categorias?</summary>
      <ul>{letters.map((letter) => <li key={letter}><strong>{letter}:</strong> {CATEGORY_PRESENTATION[letter].description}</li>)}</ul>
    </details>
  </section>;
}
