"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE_LINKS } from "@/app/lib/site-navigation";

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/dashboard")) return <>{children}</>;

  return (
    <>
      <header className="siteHeader">
        <div className="container siteHeaderInner">
          <Link className="siteBrand" href="/" aria-label="Lumen — página inicial">
            <Image src="/logo-lumen.png" alt="" width={36} height={36} priority />
            <strong>Lumen</strong>
          </Link>
          <nav className="siteNav" aria-label="Navegação principal">
            {SITE_LINKS.slice(0, 3).map((link) => (
              <Link key={link.href} className="siteNavLink" href={link.href}>{link.label}</Link>
            ))}
            <a className="siteInstallLink" href="/lumen-extension.zip" download="Lumen-Extension.zip">
              Instalar extensão
            </a>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="footer">
        <div className="footerContainer">
          <div className="footerBrand">
            <div className="footerLogo">
              <Image src="/logo-lumen.png" alt="" width={28} height={28} />
              <strong>Lumen</strong>
            </div>
            <p>Sinais automatizados para apoiar escolhas mais conscientes. O Lumen não realiza checagem factual.</p>
          </div>
          <nav aria-label="Links institucionais">
            <h2 className="footerHeading">Informações</h2>
            <ul>
              <li><Link href="/dashboard">Dashboard</Link></li>
              <li><Link href="/terms">Termos de uso</Link></li>
              <li><Link href="/privacy">Política de privacidade</Link></li>
            </ul>
          </nav>
        </div>
        <div className="footerBottom">© {new Date().getFullYear()} Lumen — projeto em desenvolvimento.</div>
      </footer>
    </>
  );
}
