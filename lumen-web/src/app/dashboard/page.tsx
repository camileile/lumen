"use client";

import { useEffect, useState } from "react";
import { Activity, Database, ShieldCheck } from "lucide-react";
import { AUTOMATED_ESTIMATE_COPY } from "@/app/lib/dashboardData";
import { DashboardHeader } from "./components/dashboard-header";
import { DashboardError, DashboardLoading } from "./components/dashboard-states";
import { DistributionCard } from "./components/distribution-card";
import { HelpCard, HistorySummaryCard, RecentSources, WeeklyAverageCard } from "./components/history-cards";
import { MascotCard } from "./components/mascot-card";
import { ScoreCard } from "./components/score-card";
import { TutorialDialog, type TourStep } from "./components/tutorial-dialog";
import { useDashboardData } from "./use-dashboard-data";
import { useExtensionConnection } from "./use-extension-connection";
import { useExtensionSessions } from "./use-extension-sessions";
import { ExtensionSessionsCard } from "./components/extension-sessions-card";
import styles from "./dashboard.module.css";

const TOUR_KEY = "lumen_dashboard_tour_done_v1";
const NAME_KEY = "lumen_user_name_v1";

const steps: TourStep[] = [
  { id: "score", anchor: "score", title: "Estimativa informacional", text: `${AUTOMATED_ESTIMATE_COPY} O cálculo considera até 20 observações recentes.` },
  { id: "distribution", anchor: "distribution", title: "Categorias A/B/C/D", text: "A categoria B também pode indicar fonte desconhecida ou evidência insuficiente. Cores são apenas apoio: letras e descrições carregam o significado." },
  { id: "history", anchor: "history", title: "Histórico real", text: "Somente datas e fontes realmente observadas aparecem aqui. Lacunas não são preenchidas com valores inventados." },
  { id: "help", anchor: "actions", title: "Ajuda e atualização", text: "Use o header para atualizar dados, conectar a extensão, visualizar o modo demo ou encerrar a sessão." },
];

export default function DashboardPage() {
  const dashboard = useDashboardData();
  const extension = useExtensionConnection();
  const extensionSessions = useExtensionSessions(dashboard.ready && Boolean(dashboard.user) && !dashboard.demo);
  const [name, setName] = useState("Lumen");
  const [draftName, setDraftName] = useState("Lumen");
  const [editingName, setEditingName] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!dashboard.user) return;
    const frame = window.requestAnimationFrame(() => {
      const initial = localStorage.getItem(NAME_KEY)?.trim() || dashboard.user?.name || "Lumen";
      setName(initial);
      setDraftName(initial);
      if (!localStorage.getItem(TOUR_KEY)) setTourOpen(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [dashboard.user]);

  function saveName() {
    const nextName = draftName.trim() || "Lumen";
    setName(nextName);
    setDraftName(nextName);
    localStorage.setItem(NAME_KEY, nextName);
    setEditingName(false);
  }

  function closeTour() {
    localStorage.setItem(TOUR_KEY, "1");
    setTourOpen(false);
    setStep(0);
  }

  if (!dashboard.ready || !dashboard.user) return <DashboardLoading />;

  return <div className={styles.page}>
    <div className={styles.dashboardAmbient} aria-hidden="true" />
    <DashboardHeader user={dashboard.user} demo={dashboard.demo} loading={dashboard.loading}
      extensionState={extension.state} extensionIdentity={extension.identity}
      onToggleDemo={() => dashboard.setDemoMode(!dashboard.demo)} onConnect={() => void extension.connect()}
      onRefresh={() => void dashboard.refresh()} onLogout={dashboard.logout} />

    <section className={styles.dashboardIntro} aria-labelledby="dashboard-title">
      <div className={styles.introCopy}>
        <p className={styles.introEyebrow}><span /> Painel de consciência digital</p>
        <h1 id="dashboard-title">Olá, {dashboard.user.name.split(" ")[0]}.<br />Este é o seu panorama digital.</h1>
        <p>Acompanhe sinais reais da sua navegação com contexto, sem transformar uma estimativa automatizada em veredito.</p>
      </div>
      <div className={styles.methodSummary} aria-label="Como os dados deste painel são organizados">
        <div className={styles.methodItem}>
          <Activity aria-hidden="true" />
          <span><strong>rolling-weight-v1</strong><small>Metodologia atual</small></span>
        </div>
        <div className={styles.methodItem}>
          <Database aria-hidden="true" />
          <span><strong>Até 20 observações</strong><small>Janela da estimativa</small></span>
        </div>
        <div className={styles.methodItem}>
          <ShieldCheck aria-hidden="true" />
          <span><strong>Dados observados</strong><small>Sem histórico inventado</small></span>
        </div>
      </div>
    </section>

    {extension.state === "error" && <p className={styles.statusError} role="alert">
      Não foi possível iniciar a conexão. Abra o popup da extensão ou tente novamente.
    </p>}

    {!dashboard.demo && dashboard.error && <DashboardError message={dashboard.error} onRetry={() => void dashboard.refresh()} />}
    {!dashboard.demo && dashboard.notice && <p className={styles.statusSuccess} role="status">{dashboard.notice}</p>}
    {!dashboard.demo && dashboard.loading && !dashboard.error && <DashboardLoading />}

    {(dashboard.demo || dashboard.hasLoaded) && <main className={`${styles.grid} ${dashboard.demo ? styles.demoGrid : ""}`} aria-busy={dashboard.loading}>
      <MascotCard data={dashboard.data} demo={dashboard.demo} name={name} draftName={draftName} editingName={editingName}
        onDraftName={setDraftName} onStartEdit={() => { setDraftName(name); setEditingName(true); }}
        onCancelEdit={() => { setDraftName(name); setEditingName(false); }} onSaveName={saveName} />
      <ScoreCard data={dashboard.data} />
      <HistorySummaryCard data={dashboard.data} />
      <DistributionCard distribution={dashboard.data.distribution} />
      <WeeklyAverageCard data={dashboard.data} />
      <RecentSources data={dashboard.data} canDelete={!dashboard.demo} deleting={dashboard.deleting} onDelete={() => {
        if (window.confirm("Excluir permanentemente todo o histórico de análises desta conta?")) {
          void dashboard.clearHistory();
        }
      }} />
      {!dashboard.demo && <ExtensionSessionsCard {...extensionSessions}
        onRefresh={() => void extensionSessions.refresh()}
        onRevoke={(sessionId) => {
          if (window.confirm("Revogar o acesso desta instalação da extensão?")) {
            void extensionSessions.revoke(sessionId).then(() => extension.refresh());
          }
        }} />}
      <HelpCard onOpenTutorial={() => setTourOpen(true)} />
    </main>}

    {tourOpen && <TutorialDialog step={step} steps={steps} styles={styles} onStep={setStep} onClose={closeTour} />}
  </div>;
}
