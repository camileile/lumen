import Image from "next/image";
import type { AuthUser } from "@/app/lib/auth";
import styles from "../dashboard.module.css";

export function DashboardHeader({ user, demo, loading, connecting, onToggleDemo, onConnect, onRefresh, onLogout }: {
  user: AuthUser;
  demo: boolean;
  loading: boolean;
  connecting: boolean;
  onToggleDemo: () => void;
  onConnect: () => void;
  onRefresh: () => void;
  onLogout: () => void;
}) {
  return <header className={styles.topbar}>
    <div className={styles.brand}>
      <Image src="/logo-lumen.png" alt="" width={28} height={28} priority />
      <strong>Lumen</strong>
    </div>
    <div className={styles.topbarControls}>
      <span className={styles.userIdentity}>{user.name}</span>
      <button type="button" onClick={onToggleDemo} className={styles.demoBtn} aria-pressed={demo}>
        {demo ? "Sair do modo demo" : "Ver modo demo"}
      </button>
      <button type="button" onClick={onConnect} className={styles.demoBtn} disabled={connecting} aria-busy={connecting}>
        {connecting ? "Conectando…" : "Conectar extensão"}
      </button>
      <button type="button" onClick={onRefresh} className={styles.demoBtn} disabled={demo || loading} aria-busy={loading}>
        {loading ? "Atualizando…" : "Atualizar dados"}
      </button>
      <button type="button" onClick={onLogout} className={styles.logoutBtn}>Sair</button>
    </div>
  </header>;
}
