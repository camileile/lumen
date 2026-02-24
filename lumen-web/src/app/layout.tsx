import "./globals.css";
import { Montserrat } from "next/font/google";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "Lumen",
  description: "Camada de consciência digital para avaliar confiabilidade.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={montserrat.className}>
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
            <strong style={{ fontWeight: 700 }}>Lumen</strong>

            <nav style={{ display: "flex", gap: 12 }}>
              <a className="btn1" href="#como-funciona">
                Como funciona
              </a>
              <a className="btn1" href="#privacidade">
                Privacidade
              </a>
              <a
                className="btn1"
                href="#instalar"
                style={{
                  background: "#285CC9",
                  padding: 2,
                  fontWeight: 600,
                  borderRadius: 7
                }}
              >
                Instalar extensão
              </a>
            </nav>
          </div>
        </header>

       <main>{children}</main>

        <footer
          style={{
            textAlign: "center",
            padding: "30px 0",
            opacity: 0.6,
            fontSize: 13,
          }}
        >
          © {new Date().getFullYear()} Lumen
        </footer>
      </body>
    </html>
  );
}