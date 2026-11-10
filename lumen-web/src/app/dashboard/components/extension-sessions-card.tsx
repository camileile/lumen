import type { ExtensionSessionSummary } from "@/app/lib/extensionAuth";
import styles from "../dashboard.module.css";
import { ExtensionSessionRevokeButton } from "./extension-session-revoke-button";

function deviceLabel(installationId: string): string {
  return `Instalação …${installationId.slice(-8)}`;
}

export function ExtensionSessionsCard({ sessions, loading, error, revokingId, onRefresh, onRevoke }: {
  sessions: ExtensionSessionSummary[];
  loading: boolean;
  error: string;
  revokingId: string;
  onRefresh: () => void;
  onRevoke: (sessionId: string) => void;
}) {
  return <section className={`${styles.card} ${styles.historyCard}`} aria-labelledby="extension-sessions-title">
    <div className={styles.cardTitleRow}>
      <div>
        <h3 id="extension-sessions-title">Extensões conectadas</h3>
        <p className={styles.helpText}>Cada instalação possui uma sessão independente.</p>
      </div>
      <button className={styles.secondaryAction} type="button" disabled={loading} onClick={onRefresh}>
        {loading ? "Atualizando…" : "Atualizar"}
      </button>
    </div>
    {error && <p className={styles.inlineError} role="alert">{error}</p>}
    {!loading && sessions.length === 0 ? <div className={styles.emptyBox} role="status">
      <strong>Nenhuma extensão conectada</strong>
      <p>Use “Conectar extensão” para autorizar este navegador.</p>
    </div> : <div className={styles.deviceList}>
      {sessions.map((session) => <article className={styles.deviceItem} key={session.id}>
        <div>
          <strong>{deviceLabel(session.installationId)}</strong>
          <p>Status: {session.status === "active" ? "Ativa" : session.status === "revoked" ? "Revogada" : "Expirada"}</p>
          <small>Último uso: {new Date(session.lastUsedAt).toLocaleString("pt-BR")}</small>
        </div>
        {session.status === "active" && <ExtensionSessionRevokeButton className={styles.dangerBtn}
          revoking={revokingId === session.id} onRevoke={() => onRevoke(session.id)} />}
      </article>)}
    </div>}
  </section>;
}
