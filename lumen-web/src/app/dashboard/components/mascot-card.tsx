import Image from "next/image";
import { Pencil } from "lucide-react";
import type { DashboardData } from "@/app/lib/types";
import styles from "../dashboard.module.css";

function mascotByStatus(status: DashboardData["statusLabel"], firstTime: boolean) {
  if (firstTime) return "/lume-amarelo.gif";
  if (status === "Faixa alta") return "/lume-verde.gif";
  if (status === "Faixa baixa") return "/lume-vermelho.gif";
  return "/lume-amarelo.gif";
}

export function MascotCard({ data, demo, name, draftName, editingName, onDraftName, onStartEdit, onCancelEdit, onSaveName }: {
  data: DashboardData;
  demo: boolean;
  name: string;
  draftName: string;
  editingName: boolean;
  onDraftName: (name: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveName: () => void;
}) {
  const firstTime = data.score === null;
  return <section className={`${styles.card} ${styles.avatarCard}`} aria-labelledby="mascot-title">
    <div className={styles.avatarTop}>
      {!editingName ? <>
        <span id="mascot-title" className={styles.userName}>{name}</span>
        <button className={styles.iconBtn} type="button" onClick={onStartEdit} aria-label="Editar nome do mascote" title="Editar nome">
          <Pencil size={16} aria-hidden="true" />
        </button>
      </> : <>
        <label className={styles.srOnly} htmlFor="mascot-name">Nome do mascote</label>
        <input id="mascot-name" name="mascotName" className={styles.nameInput} value={draftName}
          onChange={(event) => onDraftName(event.target.value)} autoFocus maxLength={40}
          onKeyDown={(event) => { if (event.key === "Enter") onSaveName(); if (event.key === "Escape") onCancelEdit(); }} />
        <button className={styles.iconBtn} type="button" onClick={onSaveName}>Salvar</button>
      </>}
    </div>
    <div className={styles.avatarBox}>
      <Image src={mascotByStatus(data.statusLabel, firstTime)} alt={`Mascote indicando ${data.statusLabel.toLowerCase()}`}
        className={styles.avatarImg} width={576} height={576} priority unoptimized />
    </div>
    <div className={styles.badge}>{data.statusLabel}{demo ? " • DEMO" : ""}</div>
    <div className={styles.xpWrap}>
      <div className={styles.xpTop}><span className={styles.xpLabel}>Estimativa atual</span><span className={styles.xpValue}>{data.score ?? "—"}</span></div>
      <div className={styles.xpTrack} role="progressbar" aria-label="Estimativa atual" aria-valuemin={0} aria-valuemax={100} aria-valuenow={data.score ?? undefined}>
        <div className={styles.xpFill} style={{ width: `${data.score ?? 0}%` }} />
      </div>
    </div>
    <div className={styles.insight}><strong>Contexto</strong><p>{data.insight}</p></div>
  </section>;
}
