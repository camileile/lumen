"use client";

import "./globals.css";
import { Montserrat } from "next/font/google";
import { usePathname } from "next/navigation";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // Verifica se a rota atual começa com /dashboard
  const isDashboard = pathname.startsWith("/dashboard");

  return (
    <html lang="pt-BR">
      <body className={montserrat.className}>
        {/* HEADER: Só aparece se NÃO for dashboard */}
        {!isDashboard && (
          <header
            style={{
              position: "sticky",
              top: 0,
              backdropFilter: "blur(10px)",
              background: "rgba(11,16,32,0.7)",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              zIndex: 100,
            }}
          >
            <div
              className="container"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 0",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <img
                  src="/logo-lumen.png"
                  alt="Lumen"
                  style={{ width: 36, height: "auto" }}
                />
                <strong style={{ fontWeight: 600, fontSize: 18 }}>Lumen</strong>
              </div>

              <nav className="topNav" style={{ display: "flex", gap: 18, alignItems: "center" }}>
                <a className="btn1" href="#como-funciona">Como funciona</a>
                <a className="btn1" href="#privacidade">Privacidade</a>
                <a className="btn1" href="/dashboard">Dashboard</a>
                <a
                  href="#instalar"
                  style={{
                    background: "#285CC9",
                    padding: "8px 14px",
                    fontWeight: 600,
                    borderRadius: 10,
                    color: "white",
                    textDecoration: "none",
                    boxShadow: "0 10px 30px rgba(40,92,201,0.3)",
                  }}
                >
                  Instalar extensão
                </a>
              </nav>
            </div>
          </header>
        )}

        <main>{children}</main>

        {/* FOOTER: Só aparece se NÃO for dashboard */}
        {!isDashboard && (
          <footer className="footer">
            <div className="footerContainer">
              {/* COLUNA 1 */}
              <div className="footerBrand">
                <div className="footerLogo">
                  <img src="/logo-lumen.png" alt="Lumen" width="28" />
                  <strong>Lumen</strong>
                </div>
                <p>
                  Transformando comportamento digital em clareza.
                  Entenda sua informação. Evolua sua consciência.
                </p>
                <div className="footerSocial">
                  <span>F</span><span>T</span><span>I</span><span>Y</span>
                </div>
              </div>

              {/* COLUNA 2 */}
              <div>
                <h4>Links Rápidos</h4>
                <ul>
                  <li><a href="/dashboard">Dashboard</a></li>
                  <li><a href="#">Termos</a></li>
                  <li><a href="#">Contato</a></li>
                  <li><a href="#">Política de Privacidade</a></li>
                </ul>
              </div>

              {/* COLUNA 3 */}
              <div>
                <h4>Informativo</h4>
                <div className="footerInputWrap">
                  <input placeholder="Digite seu e-mail" />
                  <button>✉</button>
                </div>
                <p className="footerSmall">
                  Receba novidades, análises e conteúdos sobre consumo digital consciente.
                </p>
              </div>
            </div>

            <div className="footerBottom">
              © {new Date().getFullYear()} Lumen — Consciência digital para uma internet mais saudável.
            </div>
          </footer>
        )}
      </body>
    </html>
  );
}