import styles from "./page.module.css";
import { Eye, BarChart3, TrendingUp } from "lucide-react";
import Image from "next/image";

export default function Home() {
  return (
    <div className="container">
      {/* HERO */}
      <section id="instalar" className={styles.hero}>
        <div className={styles.heroGrid}>
          {/* TEXTO */}
          <div>
            <h1 className={styles.heroTitle}>Veja seus hábitos digitais com clareza.</h1>

            <p className={styles.heroText}>
              O Lumen observa seus padrões de consumo informacional e os traduz em uma presença visual dinâmica
              que evolui com você ao longo do tempo. À medida que seus hábitos digitais mudam,
              o Lumen reflete os sinais observados — incentivando escolhas mais conscientes de forma
              natural, sem interromper sua experiência e sem interferir na sua liberdade de navegar.
            </p>
            <p className={styles.heroText}>
              Os resultados são estimativas automatizadas baseadas principalmente na fonte e no domínio.
              O Lumen não lê o texto completo da notícia e não realiza checagem factual.
            </p>

            <div style={{ marginTop: 20 }}>
              <a className="btn" href="/lumen-extension.zip" download="Lumen-Extension.zip">
                Baixar extensão (.zip)
              </a>
            </div>
          </div>

          {/* IMAGEM */}
          <div className={styles.heroRight}>
            <Image className={styles.mascot} src="/mascot.png" alt="Mascote Lumen" width={1000} height={1000} priority />
          </div>
        </div>
      </section>

     
      <section id="como-funciona" className={styles.sectionCentered}>
        <h2 className={styles.sectionTitleCentered}>Como o Lumen Funciona</h2>

        <div className={styles.grid3Centered}>
          <div className={styles.featureCard}>
            <Eye size={44} strokeWidth={1.5} className={styles.icon} />
            <h3>Detectar</h3>
            <p>Identifica a URL e o domínio acessados enquanto você navega — sem ler o texto completo da página.</p>
          </div>

          <div className={styles.featureCard}>
            <BarChart3 size={44} strokeWidth={1.5} className={styles.icon} />
            <h3>Entender</h3>
            <p>Classifica sinais de fonte/domínio e calcula uma estimativa sobre suas observações recentes.</p>
          </div>

          <div className={styles.featureCard}>
            <TrendingUp size={44} strokeWidth={1.5} className={styles.icon} />
            <h3>Evoluir</h3>
            <p>Acompanhe os sinais observados ao longo do tempo e fortaleça sua autonomia digital.</p>
          </div>
        </div>
      </section>

      {/* PRIVACIDADE */}
      <section id="privacidade" className={styles.privacySection}>
        <div className={styles.privacyGrid}>
          <div>
            <h2 className={styles.privacyTitle}>Privacidade como princípio.</h2>

            <p className={styles.privacyText}>
              Para gerar a análise e o histórico, o Lumen processa a URL e o domínio visitados. Quando conectado,
              esses dados podem ser enviados à API e ao provedor de análise automatizada. O Lumen não lê mensagens
              nem senhas.
              <br />
              URLs podem conter informações sensíveis; use o produto considerando essa limitação atual.
            </p>
          </div>

          <div className={styles.privacyImageWrap}>
            <Image className={styles.privacyImage} src="/privacy.png" alt="Ilustração sobre privacidade no Lumen" width={1000} height={1000} />
          </div>
        </div>
      </section>

      {/* DASHBOARD PREVIEW */}
      <section className={styles.previewSection}>
        <h2 className={styles.previewTitle}>Dados claros. Decisões melhores.</h2>

        <div className={styles.previewImageWrap}>
          <Image className={styles.previewImage} src="/dashboard-preview.png" alt="Prévia ilustrativa do dashboard Lumen" width={1345} height={880} />
        </div>
      </section>

      {/* CTA FINAL */}
      <section className={styles.finalCta}>
        <h2 className={styles.finalCtaTitle}>
          Comece a enxergar sua vida digital <br /> com mais clareza.
        </h2>

        <a className={styles.finalCtaButton} href="/lumen-extension.zip" download="Lumen-Extension.zip">
          Baixar extensão (.zip)
        </a>
      </section>
    </div>
  );
}
