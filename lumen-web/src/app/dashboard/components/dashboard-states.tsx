import styles from "../dashboard.module.css";

export function DashboardLoading() {
  return <div className={styles.statePanel} role="status" aria-live="polite">
    <strong>Carregando dashboard…</strong>
    <span>Preparando suas estimativas e observações.</span>
  </div>;
}

export function DashboardError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className={styles.statePanel} role="alert" aria-live="assertive">
    <strong>Não foi possível carregar o dashboard</strong>
    <span>{message}</span>
    <button type="button" className={styles.retryBtn} onClick={onRetry}>Tentar novamente</button>
  </div>;
}
