"use client";

import { useEffect, useState } from "react";
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
    <DashboardHeader user={dashboard.user} demo={dashboard.demo} loading={dashboard.loading}
      extensionState={extension.state} extensionIdentity={extension.identity}
      onToggleDemo={() => dashboard.setDemoMode(!dashboard.demo)} onConnect={() => void extension.connect()}
      onRefresh={() => void dashboard.refresh()} onLogout={dashboard.logout} />

    {extension.state === "error" && <p className={styles.statusError} role="alert">
      Não foi possível iniciar a conexão. Abra o popup da extensão ou tente novamente.
    </p>}

    {!dashboard.demo && dashboard.error && <DashboardError message={dashboard.error} onRetry={() => void dashboard.refresh()} />}
    {!dashboard.demo && dashboard.loading && !dashboard.error && <DashboardLoading />}

    {(dashboard.demo || dashboard.hasLoaded) && <main className={styles.grid} aria-busy={dashboard.loading}>
      <MascotCard data={dashboard.data} demo={dashboard.demo} name={name} draftName={draftName} editingName={editingName}
        onDraftName={setDraftName} onStartEdit={() => { setDraftName(name); setEditingName(true); }}
        onCancelEdit={() => { setDraftName(name); setEditingName(false); }} onSaveName={saveName} />
      <ScoreCard data={dashboard.data} />
      <HistorySummaryCard data={dashboard.data} />
      <DistributionCard distribution={dashboard.data.distribution} />
      <WeeklyAverageCard data={dashboard.data} />
      <RecentSources data={dashboard.data} />
      <HelpCard onOpenTutorial={() => setTourOpen(true)} />
    </main>}

    {tourOpen && <TutorialDialog step={step} steps={steps} styles={styles} onStep={setStep} onClose={closeTour} />}
  </div>;
}
