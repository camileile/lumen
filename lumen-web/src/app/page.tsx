import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  CircleCheck,
  Download,
  Eye,
  Fingerprint,
  Gauge,
  LockKeyhole,
  Link2,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { LandingMotion } from "./components/landing-motion";
import styles from "./page.module.css";

const signalCategories = [
  { category: "A", label: "Sinal mais positivo", description: "Fonte reconhecida na lista editorial atual.", tone: styles.signalA },
  { category: "B", label: "Evidência insuficiente", description: "Fonte desconhecida ou sinal neutro — não significa confiança confirmada.", tone: styles.signalB },
  { category: "C", label: "Atenção recomendada", description: "Sinais que pedem mais contexto antes de compartilhar.", tone: styles.signalC },
  { category: "D", label: "Sinal mais crítico", description: "Fonte reconhecida entre os sinais de maior cautela.", tone: styles.signalD },
] as const;

export default function Home() {
  return (
    <div id="landing-page" className={styles.page}>
      <LandingMotion />
      <div className={styles.scrollProgress} aria-hidden="true" />
      <div className={styles.ambient} aria-hidden="true">
        <span className={styles.ambientOne} />
        <span className={styles.ambientTwo} />
        <span className={styles.ambientGrid} />
      </div>

      <section id="instalar" className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroContent}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <Sparkles size={15} aria-hidden="true" />
              Consciência digital, sem interromper sua navegação
            </p>
            <h1 id="hero-title" className={styles.heroTitle}>
              Mais contexto.<br />
              <span>Menos piloto automático.</span>
            </h1>
            <p className={styles.heroLead}>
              O Lumen transforma sinais das fontes que você visita em uma leitura visual dos seus hábitos digitais —
              para você pausar, observar e decidir com mais autonomia.
            </p>
            <div className={styles.heroActions}>
              <a className={styles.primaryButton} href="/lumen-extension.zip" download="Lumen-Extension.zip">
                <Download size={18} aria-hidden="true" />
                Instalar extensão
              </a>
              <a className={styles.secondaryButton} href="#como-funciona">
                Ver como funciona
                <ArrowDown size={17} aria-hidden="true" />
              </a>
            </div>
            <ul className={styles.heroProofs} aria-label="Princípios do Lumen">
              <li><CircleCheck size={16} aria-hidden="true" /> Observação automática desativada por padrão</li>
              <li><CircleCheck size={16} aria-hidden="true" /> Você controla quando analisar</li>
            </ul>
          </div>

          <div className={styles.heroVisual} aria-label="Representação visual do mascote e dos sinais do Lumen">
            <div className={styles.orbit} aria-hidden="true" />
            <div className={styles.heroGlow} aria-hidden="true" />
            <Image className={styles.mascot} src="/mascot.png" alt="Mascote verde do Lumen" width={1000}
              height={1000} priority sizes="(max-width: 800px) 88vw, 560px" />
            <div className={`${styles.floatingCard} ${styles.floatingTop}`}>
              <span className={styles.floatingIcon}><Gauge size={17} aria-hidden="true" /></span>
              <span><strong>rolling-weight-v1</strong><small>Últimas 20 observações</small></span>
            </div>
            <div className={`${styles.floatingCard} ${styles.floatingBottom}`}>
              <span className={styles.liveDot} aria-hidden="true" />
              <span><strong>Sinal, não veredito</strong><small>Estimativa automatizada</small></span>
            </div>
            <div className={styles.categoryPill} aria-hidden="true">
              <span>A</span><span>B</span><span>C</span><span>D</span>
            </div>
          </div>
        </div>

        <a className={styles.scrollCue} href="#como-funciona" aria-label="Ir para a seção Como funciona">
          <span>Explore</span><ArrowDown size={16} aria-hidden="true" />
        </a>
      </section>

      <div>
        <section id="como-funciona" className={`${styles.section} ${styles.reveal}`} data-reveal="up" aria-labelledby="how-title">
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>Como funciona</p>
            <h2 id="how-title">Uma camada de consciência entre você e o próximo clique.</h2>
            <p>O Lumen organiza sinais que já fazem parte da sua navegação sem prometer uma verdade que não pode medir.</p>
          </div>

          <div className={styles.stepsGrid}>
            <article className={styles.stepCard}>
              <div className={styles.stepTop}><span>01</span><Eye size={25} aria-hidden="true" /></div>
              <h3>Percebe a fonte</h3>
              <p>Identifica o domínio da página quando você solicita uma análise ou ativa a observação permitida.</p>
              <small>Não lê o texto completo do artigo.</small>
            </article>
            <article className={styles.stepCard}>
              <div className={styles.stepTop}><span>02</span><ScanSearch size={25} aria-hidden="true" /></div>
              <h3>Traduz em sinais</h3>
              <p>Classifica a fonte em A/B/C/D e combina suas observações recentes em um score consistente.</p>
              <small>Não é uma checagem factual.</small>
            </article>
            <article className={styles.stepCard}>
              <div className={styles.stepTop}><span>03</span><TrendingUp size={25} aria-hidden="true" /></div>
              <h3>Mostra a trajetória</h3>
              <p>Apresenta histórico, distribuição e tendências usando somente observações que realmente existem.</p>
              <small>Sem preencher lacunas com dados inventados.</small>
            </article>
          </div>
        </section>

        <section className={`${styles.signalSection} ${styles.reveal}`} data-reveal="split" aria-labelledby="signals-title">
          <div className={styles.signalIntro}>
            <p className={styles.kicker}>Clareza sobre o score</p>
            <h2 id="signals-title">Cor ajuda. Contexto explica.</h2>
            <p>
              Cada categoria é um sinal sobre a fonte. O score resume até 20 observações recentes e não representa
              uma probabilidade matemática de uma notícia ser verdadeira.
            </p>
            <div className={styles.signalNote}>
              <Fingerprint size={23} aria-hidden="true" />
              <span><strong>B não significa “confiável”.</strong> Pode indicar fonte desconhecida ou evidência insuficiente.</span>
            </div>
          </div>

          <div className={styles.signalPanel} aria-label="Significado das categorias do Lumen">
            <div className={styles.signalPanelHeader}>
              <span>Leitura dos sinais</span><span className={styles.illustrativeLabel}>Contrato atual</span>
            </div>
            <div className={styles.signalList}>
              {signalCategories.map((item) => (
                <div className={styles.signalRow} key={item.category}>
                  <span className={`${styles.signalBadge} ${item.tone}`}>{item.category}</span>
                  <span className={styles.signalCopy}>
                    <strong>{item.label}</strong><small>{item.description}</small>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={`${styles.dashboardSection} ${styles.reveal}`} data-reveal="split-reverse" aria-labelledby="dashboard-title">
          <div className={styles.dashboardCopy}>
            <p className={styles.kicker}>Seu histórico, com honestidade</p>
            <h2 id="dashboard-title">Dados observados.<br />Nada de tendências inventadas.</h2>
            <p>
              O dashboard transforma suas observações reais em uma visão simples da evolução, das semanas e da
              distribuição entre categorias.
            </p>
            <ul>
              <li><BarChart3 size={18} aria-hidden="true" /> Evolução apenas nos dias com observações</li>
              <li><TrendingUp size={18} aria-hidden="true" /> Comparação entre semanas realmente disponíveis</li>
              <li><Gauge size={18} aria-hidden="true" /> Score canônico em todos os pontos do produto</li>
            </ul>
            <Link className={styles.textLink} href="/login">
              Acessar meu dashboard <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>

          <div className={styles.dashboardVisual}>
            <div className={styles.browserBar} aria-hidden="true">
              <span /><span /><span /><div>app.lumen</div>
            </div>
            <Image className={styles.dashboardImage} src="/dashboard-preview.png"
              alt="Prévia ilustrativa do dashboard Lumen com score, gráficos e categorias" width={1345} height={880}
              sizes="(max-width: 900px) 94vw, 760px" />
            <span className={styles.previewCaption}>Prévia ilustrativa</span>
          </div>
        </section>

        <section id="privacidade" className={`${styles.privacySection} ${styles.reveal}`} data-reveal="split" aria-labelledby="privacy-title">
          <div className={styles.privacyVisual} aria-label="Exemplo visual da minimização de uma URL pelo Lumen">
            <div className={styles.privacyConsole}>
              <div className={styles.privacyConsoleHeader}>
                <span><i aria-hidden="true" /><strong>Privacy guard</strong></span>
                <small>Exemplo ilustrativo</small>
              </div>

              <div className={styles.privacyStatus}>
                <span className={styles.privacyStatusIcon}><ShieldCheck size={27} aria-hidden="true" /></span>
                <span><strong>Somente o necessário</strong><small>Processamento limitado à origem da fonte</small></span>
                <span className={styles.activeLabel}>Ativo</span>
              </div>

              <div className={styles.privacyUrlFlow}>
                <div className={styles.privacyUrlInput}>
                  <span>URL recebida</span>
                  <code><Link2 size={14} aria-hidden="true" /> news.example/artigo?session=•••#comentarios</code>
                </div>
                <div className={styles.minimizeStep} aria-hidden="true">
                  <span>minimização</span><ArrowDown size={16} />
                </div>
                <div className={styles.privacyUrlOutput}>
                  <span>Origem usada na análise</span>
                  <code><CircleCheck size={15} aria-hidden="true" /> https://news.example/</code>
                </div>
              </div>

              <div className={styles.privacyChecklist} aria-label="Proteções aplicadas à URL">
                <span><CircleCheck size={14} aria-hidden="true" /> Fragmento removido</span>
                <span><CircleCheck size={14} aria-hidden="true" /> Query sensível removida</span>
                <span><CircleCheck size={14} aria-hidden="true" /> Credenciais rejeitadas</span>
              </div>
            </div>
          </div>
          <div className={styles.privacyCopy}>
            <p className={styles.kicker}>Privacidade e controle</p>
            <h2 id="privacy-title">A decisão de observar começa com você.</h2>
            <p>
              A observação automática começa desligada. Quando uma análise é feita, o Lumen minimiza a URL para
              trabalhar com a origem da fonte e mantém controles para limpar dados locais e excluir o histórico da conta.
            </p>
            <div className={styles.privacyPoints}>
              <span><LockKeyhole size={18} aria-hidden="true" /><strong>Sem ler senhas ou mensagens</strong></span>
              <span><Eye size={18} aria-hidden="true" /><strong>Observação sob seu controle</strong></span>
            </div>
            <Link className={styles.textLink} href="/privacy">
              Entender a política de privacidade <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section className={`${styles.finalCta} ${styles.reveal}`} data-reveal="scale" aria-labelledby="cta-title">
          <div className={styles.ctaGlow} aria-hidden="true" />
          <div className={styles.ctaBadge}><span aria-hidden="true" /> Extensão para Chrome e Chromium</div>
          <p className={styles.kicker}>Um olhar mais consciente</p>
          <h2 id="cta-title">Sua navegação já conta uma história.<br />Comece a enxergá-la.</h2>
          <p>Instale a extensão, conecte sua conta e acompanhe sinais reais da sua rotina digital.</p>
          <div className={styles.ctaActions}>
            <a className={styles.primaryButton} href="/lumen-extension.zip" download="Lumen-Extension.zip">
              <Download size={18} aria-hidden="true" /> Baixar extensão (.zip)
            </a>
            <Link className={styles.secondaryButton} href="/login">
              Entrar no Lumen <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <small>Estimativas automatizadas baseadas principalmente em sinais de fonte e domínio. Não é fact checking.</small>
        </section>
      </div>
    </div>
  );
}
