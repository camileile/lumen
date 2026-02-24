import styles from "./page.module.css";
import { Eye, BarChart3, TrendingUp } from "lucide-react";

export default function Home() {
  return (
    <div className="container">

      {/* HERO */}
      <section id="instalar" className={styles.hero}>
        <div className={styles.heroGrid}>

          {/* TEXTO */}
          <div>
            <h1 className={styles.heroTitle}>
              Veja seus hábitos digitais com clareza.
            </h1>

            <p className={styles.heroText}>
              O Lumen observa seus padrões de consumo informacional e os traduz em uma presença visual dinâmica
              que evolui com você ao longo do tempo. À medida que seus hábitos digitais se tornam mais saudáveis
              e equilibrados, o Lumen reflete essa transformação — incentivando escolhas mais conscientes de forma
              natural, sem interromper sua experiência e sem interferir na sua liberdade de navegar.
            </p>

            <div style={{ marginTop: 20 }}>
              <a className="btn" href="#">
                Instalar extensão
              </a>
            </div>
          </div>

          {/* IMAGEM */}
          <div className={styles.heroRight}>
            <img
              className={styles.mascot}
              src="/mascot.png"
              alt="Mascote Lumen"
            />
          </div>

        </div>
      </section>

      {/* COMO FUNCIONA (igual ao print) */}
      <section id="como-funciona" className={styles.sectionCentered}>
        <h2 className={styles.sectionTitleCentered}>Como o Lumen Funciona</h2>

        <div className={styles.grid3Centered}>

          <div className={styles.featureCard}>
            <Eye size={44} strokeWidth={1.5} className={styles.icon} />
            <h3>Detectar</h3>
            <p>
              Reconhece o conteúdo que você acessa enquanto navega — sem interferir na sua experiência.
            </p>
          </div>

          <div className={styles.featureCard}>
            <BarChart3 size={44} strokeWidth={1.5} className={styles.icon} />
            <h3>Entender</h3>
            <p>
              Classifica fontes e calcula um score informacional baseado na qualidade do que você consome.
            </p>
          </div>

          <div className={styles.featureCard}>
            <TrendingUp size={44} strokeWidth={1.5} className={styles.icon} />
            <h3>Evoluir</h3>
            <p>
              Acompanhe sua evolução, desenvolva hábitos mais saudáveis e fortaleça sua autonomia digital.
            </p>
          </div>

        </div>
      </section>

      
     {/* PRIVACIDADE */}
<section id="privacidade" className={styles.privacySection}>
  <div className={styles.privacyGrid}>

    <div>
      <h2 className={styles.privacyTitle}>Privacidade como princípio.</h2>

      <p className={styles.privacyText}>
        O Lumen analisa apenas dados públicos de navegação e não coleta mensagens, senhas ou informações sensíveis. 
        <br />Seu comportamento não é exposto — apenas refletido para você.
  
      </p>
    </div>

    <div className={styles.privacyImageWrap}>
      <img
        className={styles.privacyImage}
        src="/privacy.png"
        alt="Privacidade no Lumen"
      />
    </div>

  </div>
</section>

{/* DASHBOARD PREVIEW */}
<section className={styles.previewSection}>
  <h2 className={styles.previewTitle}>
    Dados claros. Decisões melhores.
  </h2>

  <div className={styles.previewImageWrap}>
    <img
      className={styles.previewImage}
      src="/dashboard-preview.png"
      alt="Dashboard Lumen"
    />
  </div>

  
</section>
{/* CTA FINAL */}
<section className={styles.finalCta}>
  <h2 className={styles.finalCtaTitle}>
    Comece a enxergar sua vida digital <br /> com mais clareza.
  </h2>

  <a className={styles.finalCtaButton} href="#">
    Instalar extensão
  </a>
</section>
    </div>
  );
}