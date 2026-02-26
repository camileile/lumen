"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./dashboard.module.css";
import { getDashboardMock } from "../lib/dashboardMock";
import { ChevronRight, X, User, Download, Settings, Trophy, Pencil } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

type TourStep = {
  id: string;
  title: string;
  text: string;
  anchor: "score" | "distribution" | "history" | "actions";
};

const TOUR_KEY = "lumen_dashboard_tour_done_v1";
const NAME_KEY = "lumen_user_name_v1";

function mascotByScore(score: number, firstTime: boolean, demo: boolean) {
  if (demo) return "/lume-verde.gif"; 
  if (firstTime) return "/lume-amarelo.gif"; 
  if (score >= 70) return "/lume-verde.gif";
  if (score >= 40) return "/lume-amarelo.gif";
  return "/lume-vermelho.gif";
}

function xpText(xp: number) {
  if (xp >= 80) return "Quase no próximo nível!";
  if (xp >= 40) return "Evoluindo bem!";
  return "Primeiros passos!";
}

/** * CORREÇÃO: ScoreLine ajustado para não cortar o texto do eixo X 
 * Adicionado margin bottom e dy para empurrar as legendas.
 */
function ScoreLine({ data, showAxis = false }: { data: { day: string; value: number }[], showAxis?: boolean }) {
  return (
    <div style={{ height: "100%", width: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart 
          data={data} 
          margin={{ top: 5, right: 10, left: 10, bottom: showAxis ? 25 : 5 }}
        >
          <CartesianGrid strokeOpacity={0.12} vertical={false} />
          <XAxis 
            dataKey="day" 
            hide={!showAxis} 
            axisLine={false}
            tickLine={false}
            tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
            interval={0} // Garante que todos os dias apareçam
            dy={10}      // Afasta o texto da linha do gráfico
          />
          <Tooltip 
            contentStyle={{
              background: "#1a1c23",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 10,
              fontSize: "12px",
              color: "#fff"
            }}
            itemStyle={{ color: "#78ffa0" }}
          />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="#78ffa0" 
            strokeWidth={3} 
            dot={false} 
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** * CORREÇÃO: WeeklyBars com margin para evitar nomes encavalados na base.
 */
function WeeklyBars({ data }: { data: { day: string; value: number }[] }) {
  return (
    <div style={{ height: "100%", width: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={data} 
          margin={{ top: 10, right: 5, left: 5, bottom: 25 }}
        >
          <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
          <XAxis 
            dataKey="day" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }}
            interval={0}
            dy={10}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.05)" }}
            contentStyle={{
              background: "#1a1c23",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 10,
              color: "#fff",
            }}
          />
          <Bar dataKey="value" fill="#78ffa0" radius={[4, 4, 0, 0]} barSize={20} opacity={0.8} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function DashboardPage() {
  const [firstTime, setFirstTime] = useState(true);
  const [demo, setDemo] = useState(true); 

  useEffect(() => {
    const done = localStorage.getItem("lumen_has_data_v1");
    setFirstTime(!done);
  }, []);

  const data = useMemo(
    () => getDashboardMock(demo ? false : firstTime),
    [firstTime, demo]
  );

  const [name, setName] = useState("Lumen");
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState("Lumen");

  useEffect(() => {
    const saved = localStorage.getItem(NAME_KEY);
    const initial = (saved && saved.trim()) || (data?.user?.name ? data.user.name : "Lumen");

    setName(initial);
    setDraftName(initial);
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
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <img src="/logo-lumen.png" alt="Lumen" />
          <strong>Lumen</strong>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button
            type="button"
            onClick={() => setDemo((d) => !d)}
            className={styles.demoBtn}
          >
            {demo ? "Modo Demo ON" : "Modo Demo OFF"}
          </button>

          <div className={styles.userArea}>
            <button className={styles.userBtn} type="button">
              <User size={18} />
              <span>Conta</span>
            </button>
          </div>
        </div>
      </header>

      <main className={styles.grid}>
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
            <img src={mascotByScore(data.score, firstTime, demo)} alt="Lumen" className={styles.avatarImg} />
          </div>

          <div className={styles.badge}>{data.statusLabel}</div>

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

          <div className={styles.segment}>
            <button className={styles.segmentBtn} type="button">Base</button>
            <button className={`${styles.segmentBtn} ${styles.segmentActive}`} type="button">Estável</button>
            <button className={styles.segmentBtn} type="button">Evoluindo</button>
          </div>

          <div className={styles.insight}>
            <strong>Insight:</strong>
            <p>{data.insight}</p>
          </div>
        </section>

        <section className={`${styles.card} ${styles.scoreCard}`} data-anchor="score">
          <div className={styles.scoreHeader}>
            <h2>Score Informacional</h2>
          </div>

          <div className={styles.scoreContent}>
            <div className={styles.chartMock} style={{ height: 180 }}>
              {data.scoreSeries.length === 0 ? (
                <div className={styles.chartEmpty}>
                  <strong>Sem dados ainda</strong>
                  <span>Faça sua primeira análise para ver a evolução.</span>
                </div>
              ) : (
                <ScoreLine data={data.scoreSeries} showAxis={true} />
              )}
            </div>

            <div className={styles.scoreSide}>
              <div className={styles.scoreValue}>{data.score}</div>
              <div className={styles.scoreLabel}>{data.statusLabel}</div>
              <div className={styles.scoreHint}>{data.statusHint}</div>
            </div>
          </div>
        </section>

        <section className={`${styles.card} ${styles.smallCard}`}>
          <h3>{data.trend.title}</h3>
          <p className={styles.smallSub}>↗ {data.trend.subtitle}</p>

          {data.weeklySeries.length === 0 ? (
            <div className={styles.miniEmpty}>
              <span>Sem dados</span>
            </div>
          ) : (
            <div className={styles.miniChart} style={{ height: 120 }}>
              <ScoreLine data={data.weeklySeries} />
            </div>
          )}
        </section>

        <section className={`${styles.card} ${styles.smallCard}`} data-anchor="distribution">
          <h3>Distribuição</h3>
          {data.distribution.length === 0 ? (
            <div className={styles.placeholderBox}>
              <strong>Sem dados de distribuição</strong>
              <p>Analise algumas URLs para ver como o Lumen classifica seu consumo.</p>
            </div>
          ) : (
            <div className={styles.bars}>
              {data.distribution.map((item) => (
                <div key={item.label} className={styles.barRow}>
                  <span style={{fontSize: 12}}>{item.label}</span>
                  <div className={styles.barTrack}>
                    <div
                      className={`${styles.barFill} ${
                        item.colorKey === "good" ? styles.bar_good : 
                        item.colorKey === "neutral" ? styles.bar_neutral : 
                        item.colorKey === "warn" ? styles.bar_warn : styles.bar_bad
                      }`}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                  <span style={{ textAlign: "right", fontSize: 12 }}>{item.value}%</span>
                </div>
              ))}
            </div>
          )}
        </section>

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
            <div className={styles.miniChart2} style={{ height: 140 }}>
              <WeeklyBars data={data.weeklySeries} />
            </div>
          )}
        </section>

        <section className={`${styles.card} ${styles.historyCard}`} data-anchor="history">
          <h3>Últimos acessos</h3>
          <div className={styles.historyList}>
            {data.lastAccess.length === 0 ? (
              <div className={styles.emptyBox}>
                <strong>Nenhum acesso ainda</strong>
                <p>Assim que você analisar sites, o Lumen vai registrar seu histórico aqui.</p>
              </div>
            ) : (
              data.lastAccess.map((a) => (
                <div key={a.id} className={styles.historyItem}>
                  <div className={`${styles.letter} ${styles["letter_" + a.label]}`}>{a.label}</div>
                  <div className={styles.historyText}>
                    <div className={styles.historyUrl}>{a.url}</div>
                  </div>
                  <button className={styles.smallBtn} type="button">Verificar fonte</button>
                </div>
              ))
            )}
          </div>
        </section>

        <section className={`${styles.card} ${styles.actionsCard}`} data-anchor="actions">
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
          <button className={styles.tourBtn} type="button" onClick={() => setTourOpen(true)}>
            Reabrir tutorial
          </button>
        </section>
      </main>

      {tourOpen && (
        <div className={styles.tourOverlay}>
          <div className={styles.tourCard}>
            <button className={styles.tourClose} onClick={finishTour} aria-label="Fechar">
              <X size={18} />
            </button>
            <div className={styles.tourTitle}>{current.title}</div>
            <div className={styles.tourText}>{current.text}</div>
            <div className={styles.tourFooter}>
              <span className={styles.tourSteps}>{step + 1} / {steps.length}</span>
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
                    onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
                  >
                    Próximo
                  </button>
                ) : (
                  <button className={styles.tourPrimary} type="button" onClick={finishTour}>
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