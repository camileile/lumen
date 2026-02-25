"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./dashboard.module.css";
import { getDashboardMock } from "../lib/dashboardMock";
import { ChevronRight, X, User, Download, Settings, Trophy, Pencil } from "lucide-react";

type TourStep = {
  id: string;
  title: string;
  text: string;
  anchor: "score" | "distribution" | "history" | "actions";
};

const TOUR_KEY = "lumen_dashboard_tour_done_v1";
const NAME_KEY = "lumen_user_name_v1";

function mascotByScore(score: number, firstTime: boolean) {
  if (firstTime) return "/lume-amarelo.gif"; // primeira vez: neutro
  if (score >= 70) return "/lume-verde.gif";
  if (score >= 40) return "/lume-amarelo.gif";
  return "/lume-vermelho.gif";
}

function xpText(xp: number) {
  if (xp >= 80) return "Quase no próximo nível!";
  if (xp >= 40) return "Evoluindo bem!";
  return "Primeiros passos!";
}

export default function DashboardPage() {
  const [firstTime, setFirstTime] = useState(true);

  useEffect(() => {
    const done = localStorage.getItem("lumen_has_data_v1");
    setFirstTime(!done);
  }, []);

  const data = useMemo(() => getDashboardMock(firstTime), [firstTime]);

  // ✅ hooks do nome AQUI DENTRO
  const [name, setName] = useState("Lumen");
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState("Lumen");

  // pega nome salvo (ou do mock) quando data ficar pronta
  useEffect(() => {
    const saved = localStorage.getItem(NAME_KEY);
    const initial =
      (saved && saved.trim()) || (data?.user?.name ? data.user.name : "Lumen");

    setName(initial);
    setDraftName(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.user?.name]);

  function startEditName() {
    setDraftName(name);
    setEditingName(true);
  }

  function cancelEditName() {
    setDraftName(name);
    setEditingName(false);
  }

  function saveName(next?: string) {
    const finalName = (next ?? draftName).trim() || "Lumen";
    setName(finalName);
    setDraftName(finalName);
    localStorage.setItem(NAME_KEY, finalName);
    setEditingName(false);
  }

  const [tourOpen, setTourOpen] = useState(false);
  const [step, setStep] = useState(0);

  const steps: TourStep[] = [
    {
      id: "s1",
      anchor: "score",
      title: "Seu Score Informacional",
      text: "Aqui você vê a evolução do seu consumo informacional. Quanto mais equilibrado, mais “saudável” fica.",
    },
    {
      id: "s2",
      anchor: "distribution",
      title: "Distribuição de fontes",
      text: "Este gráfico mostra o tipo de conteúdo mais frequente: confiável, neutro, sensacionalista e desinformação.",
    },
    {
      id: "s3",
      anchor: "history",
      title: "Últimos acessos",
      text: "Seu histórico recente aparece aqui. Depois, isso virá do banco via API do backend.",
    },
    {
      id: "s4",
      anchor: "actions",
      title: "Ações rápidas",
      text: "Atalhos para configurações, exportar relatório e conquistas. Mais pra frente isso vira funcional de verdade.",
    },
  ];

  useEffect(() => {
    const done = localStorage.getItem(TOUR_KEY);
    if (!done) setTourOpen(true);
  }, []);

  function finishTour() {
    localStorage.setItem(TOUR_KEY, "1");
    setTourOpen(false);
  }

  const current = steps[step];

  return (
    <div className={styles.page}>
      {/* ... SEU JSX CONTINUA IGUAL DAQUI PRA BAIXO ... */}
      {/* Topbar do dashboard */}
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <img src="/logo-lumen.png" alt="Lumen" />
          <strong>Lumen</strong>
        </div>

        <div className={styles.userArea}>
          <button className={styles.userBtn} type="button">
            <User size={18} />
            <span>Conta</span>
          </button>
        </div>
      </header>

      <main className={styles.grid}>
        {/* LEFT - perfil / avatar */}
        <section className={`${styles.card} ${styles.avatarCard}`}>
          <div className={styles.avatarTop}>
  {!editingName ? (
    <>
      <span className={styles.userName}>{name}</span>

      <button
        className={styles.iconBtn}
        type="button"
        onClick={startEditName}
        aria-label="Editar nome"
        title="Editar nome"
      >
        <Pencil size={16} />
      </button>
    </>
  ) : (
    <>
      <input
        className={styles.nameInput}
        value={draftName}
        onChange={(e) => setDraftName(e.target.value)}
        autoFocus
        onBlur={() => saveName()}
        onKeyDown={(e) => {
          if (e.key === "Enter") saveName();
          if (e.key === "Escape") cancelEditName();
        }}
      />

      <button
        className={styles.iconBtn}
        type="button"
        onClick={() => saveName()}
        aria-label="Salvar nome"
        title="Salvar"
      >
        OK
      </button>
    </>
  )}
</div>

          <div className={styles.avatarBox}>
            <img
              src={mascotByScore(data.score, firstTime)}
              alt="Lumen"
              className={styles.avatarImg}
            />
          </div>

          <div className={styles.badge}>{data.statusLabel}</div>

          {/* XP */}
          <div className={styles.xpWrap}>
            <div className={styles.xpTop}>
              <span className={styles.xpLabel}>XP</span>
              <span className={styles.xpValue}>{data.xp}%</span>
            </div>

            <div className={styles.xpTrack}>
              <div className={styles.xpFill} style={{ width: `${data.xp}%` }} />
            </div>

            <div className={styles.xpHint}>{xpText(data.xp)}</div>
          </div>

          {/* Segment */}
          <div className={styles.segment}>
            <button className={styles.segmentBtn} type="button">
              Base
            </button>
            <button
              className={`${styles.segmentBtn} ${styles.segmentActive}`}
              type="button"
            >
              Estável
            </button>
            <button className={styles.segmentBtn} type="button">
              Evoluindo
            </button>
          </div>

          {/* Insight */}
          <div className={styles.insight}>
            <strong>Insight:</strong>
            <p>{data.insight}</p>
          </div>
        </section>

        {/* SCORE */}
        <section
          className={`${styles.card} ${styles.scoreCard}`}
          data-anchor="score"
        >
          <div className={styles.scoreHeader}>
            <h2>Score Informacional</h2>
          </div>

          <div className={styles.scoreContent}>
            <div className={styles.chartMock}>
              <div className={styles.chartGrid} />

              {data.scoreSeries.length === 0 ? (
                <div className={styles.chartEmpty}>
                  <strong>Sem dados ainda</strong>
                  <span>Faça sua primeira análise para ver a evolução.</span>
                </div>
              ) : (
                <>
                  <div className={styles.chartLine} />
                  <div className={styles.chartArrow} />
                  <div className={styles.chartDays}>
                    {data.scoreSeries.map((p) => (
                      <span key={p.day}>{p.day}</span>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className={styles.scoreSide}>
              <div className={styles.scoreValue}>{data.score}</div>
              <div className={styles.scoreLabel}>{data.statusLabel}</div>
              <div className={styles.scoreHint}>{data.statusHint}</div>
            </div>
          </div>
        </section>

        {/* TENDÊNCIA */}
        <section className={`${styles.card} ${styles.smallCard}`}>
          <h3>{data.trend.title}</h3>
          <p className={styles.smallSub}>↗ {data.trend.subtitle}</p>

          {data.weeklySeries.length === 0 ? (
            <div className={styles.miniEmpty}>
              <span>Sem dados</span>
            </div>
          ) : (
            <div className={styles.miniChart} />
          )}

          <div className={styles.miniDays}>
            <span>seg</span>
            <span>ter</span>
            <span>qua</span>
            <span>qui</span>
            <span>sex</span>
            <span>sáb</span>
            <span>dom</span>
          </div>
        </section>

        {/* DISTRIBUIÇÃO */}
        <section
          className={`${styles.card} ${styles.smallCard}`}
          data-anchor="distribution"
        >
          <h3>Distribuição</h3>

          {data.distribution.length === 0 ? (
            <div className={styles.placeholderBox}>
              <strong>Sem dados de distribuição</strong>
              <p>
                Analise algumas URLs para ver como o Lumen classifica seu
                consumo.
              </p>
            </div>
          ) : (
            <div className={styles.bars}>
              {data.distribution.map((item) => (
                <div key={item.label} className={styles.barRow}>
                  <span>{item.label}</span>

                  <div className={styles.barTrack}>
                    <div
                      className={`${styles.barFill} ${
                        item.colorKey === "good"
                          ? styles.bar_good
                          : item.colorKey === "neutral"
                          ? styles.bar_neutral
                          : item.colorKey === "warn"
                          ? styles.bar_warn
                          : styles.bar_bad
                      }`}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>

                  <span style={{ textAlign: "right" }}>{item.value}%</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* MÉDIA SEMANAL */}
        <section className={`${styles.card} ${styles.smallCard}`}>
          <h3>Média semanal</h3>

          <div className={styles.weekValue}>
            <span>{data.score}</span>
          </div>

          {data.weeklySeries.length === 0 ? (
            <div className={styles.miniEmpty}>
              <span>Sem dados</span>
            </div>
          ) : (
            <div className={styles.miniChart2} />
          )}

          <div className={styles.miniDays}>
            <span>seg</span>
            <span>ter</span>
            <span>qua</span>
            <span>qui</span>
            <span>sex</span>
            <span>sáb</span>
            <span>dom</span>
          </div>
        </section>

        {/* HISTÓRICO */}
        <section
          className={`${styles.card} ${styles.historyCard}`}
          data-anchor="history"
        >
          <h3>Últimos acessos</h3>

          <div className={styles.historyList}>
            {data.lastAccess.length === 0 ? (
              <div className={styles.emptyBox}>
                <strong>Nenhum acesso ainda</strong>
                <p>
                  Assim que você analisar sites, o Lumen vai registrar seu
                  histórico aqui.
                </p>

               
              </div>
            ) : (
              data.lastAccess.map((a) => (
                <div key={a.id} className={styles.historyItem}>
                  <div
                    className={`${styles.letter} ${styles["letter_" + a.label]}`}
                  >
                    {a.label}
                  </div>

                  <div className={styles.historyText}>
                    <div className={styles.historyUrl}>{a.url}</div>
                  </div>

                  <button className={styles.smallBtn} type="button">
                    Verificar fonte
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* AÇÕES */}
        <section
          className={`${styles.card} ${styles.actionsCard}`}
          data-anchor="actions"
        >
          <h3>Ações rápidas</h3>

          <button className={styles.actionBtn} type="button">
            <Trophy size={18} />
            <span>Ver conquistas</span>
            <ChevronRight size={18} className={styles.actionArrow} />
          </button>

          <button className={styles.actionBtn} type="button">
            <Settings size={18} />
            <span>Configurações</span>
            <ChevronRight size={18} className={styles.actionArrow} />
          </button>

          <button className={styles.actionBtn} type="button">
            <Download size={18} />
            <span>Exportar relatório</span>
            <ChevronRight size={18} className={styles.actionArrow} />
          </button>

          <button
            className={styles.tourBtn}
            type="button"
            onClick={() => setTourOpen(true)}
          >
            Reabrir tutorial
          </button>
        </section>
      </main>

      {/* TOUR */}
      {tourOpen && (
        <div className={styles.tourOverlay}>
          <div className={styles.tourCard}>
            <button
              className={styles.tourClose}
              onClick={finishTour}
              aria-label="Fechar"
            >
              <X size={18} />
            </button>

            <div className={styles.tourTitle}>{current.title}</div>
            <div className={styles.tourText}>{current.text}</div>

            <div className={styles.tourFooter}>
              <span className={styles.tourSteps}>
                {step + 1} / {steps.length}
              </span>

              <div className={styles.tourBtns}>
                <button
                  className={styles.tourGhost}
                  type="button"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  disabled={step === 0}
                >
                  Voltar
                </button>

                {step < steps.length - 1 ? (
                  <button
                    className={styles.tourPrimary}
                    type="button"
                    onClick={() =>
                      setStep((s) => Math.min(steps.length - 1, s + 1))
                    }
                  >
                    Próximo
                  </button>
                ) : (
                  <button
                    className={styles.tourPrimary}
                    type="button"
                    onClick={finishTour}
                  >
                    Entendi
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}