import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { SiteChrome } from "./components/site-chrome";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const title = "Lumen — Consciência digital";
const description =
  "Estimativas automatizadas baseadas principalmente em sinais de fonte e domínio para apoiar uma navegação mais consciente.";
const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata: Metadata = {
  metadataBase: configuredSiteUrl ? new URL(configuredSiteUrl) : undefined,
  title: { default: title, template: "%s | Lumen" },
  description,
  openGraph: {
    title,
    description,
    type: "website",
    siteName: "Lumen",
    ...(configuredSiteUrl ? { url: configuredSiteUrl } : {}),
  },
  ...(configuredSiteUrl ? { alternates: { canonical: "/" } } : {}),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {

  return (
    <html lang="pt-BR" data-scroll-behavior="smooth">
      <body className={montserrat.className}>
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
