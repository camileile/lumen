import Image from "next/image";
import Link from "next/link";
import { Cable, Eye, LogOut, RefreshCw } from "lucide-react";
import type { AuthUser } from "@/app/lib/auth";
import styles from "../dashboard.module.css";
import type { ExtensionConnectionState } from "../use-extension-connection";

export function DashboardHeader({ user, demo, loading, extensionState, extensionIdentity, onToggleDemo, onConnect, onRefresh, onLogout }: {
  user: AuthUser;
  demo: boolean;
  loading: boolean;
  extensionState: ExtensionConnectionState;
  extensionIdentity: string;
  onToggleDemo: () => void;
  onConnect: () => void;
  onRefresh: () => void;
  onLogout: () => void;
}) {
  const extensionLabel = extensionState === "checking" ? "Detectando extensão…"
    : extensionState === "connecting" ? "Abrindo autorização…"
    : extensionState === "connected" ? `Extensão conectada${extensionIdentity ? `: ${extensionIdentity}` : ""}`
    : extensionState === "missing" ? "Extensão não detectada"
    : extensionState === "error" ? "Tentar conectar novamente"
    : "Conectar extensão";
  return <header className={styles.topbar}>
    <Link href="/" className={styles.brand} aria-label="Ir para a página inicial do Lumen">
      <Image src="/logo-lumen.png" alt="" width={28} height={28} priority />
      <span className={styles.brandCopy}><strong>Lumen</strong><small>Dashboard</small></span>
    </Link>
    <div className={styles.topbarControls}>
      <span className={styles.userIdentity}><span className={styles.userAvatar} aria-hidden="true">{user.name.charAt(0).toUpperCase()}</span><span>{user.name}</span></span>
      <button type="button" onClick={onToggleDemo} className={`${styles.demoBtn} ${styles.headerAction}`} aria-pressed={demo}>
        <Eye size={15} aria-hidden="true" />
        {demo ? "Sair do modo demo" : "Ver modo demo"}
      </button>
      <button type="button" onClick={onConnect} className={`${styles.demoBtn} ${styles.headerPrimary}`}
        disabled={extensionState === "checking" || extensionState === "connecting" || extensionState === "connected"}
        aria-busy={extensionState === "checking" || extensionState === "connecting"}>
        <Cable size={15} aria-hidden="true" />
        {extensionLabel}
      </button>
      <button type="button" onClick={onRefresh} className={`${styles.demoBtn} ${styles.iconAction}`} disabled={demo || loading} aria-busy={loading}
        aria-label={loading ? "Atualizando dados" : "Atualizar dados"} title={loading ? "Atualizando dados" : "Atualizar dados"}>
        <RefreshCw size={16} aria-hidden="true" className={loading ? styles.spinning : undefined} />
        <span className={styles.actionLabel}>{loading ? "Atualizando…" : "Atualizar dados"}</span>
      </button>
      <button type="button" onClick={onLogout} className={styles.logoutBtn}><LogOut size={15} aria-hidden="true" /><span>Sair</span></button>
    </div>
  </header>;
}
