import type { Metadata } from "next";
import styles from "../legal.module.css";

export const metadata: Metadata = { title: "Termos de uso" };

export default function TermsPage() {
  return <article className={styles.page}>
    <h1>Termos de uso</h1>
    <p className={styles.notice}>O Lumen está em desenvolvimento. Estes termos são um aviso de uso e não uma política jurídica definitiva.</p>
    <h2>Natureza dos resultados</h2>
    <p>Os resultados são estimativas automatizadas baseadas principalmente em sinais de fonte e domínio. Não são checagem factual, diagnóstico, recomendação profissional nem probabilidade matemática de verdade.</p>
    <h2>Uso responsável</h2>
    <p>Use os sinais como apoio à análise crítica e consulte fontes independentes antes de tomar decisões importantes.</p>
    <h2>Disponibilidade</h2>
    <p>Como projeto em modernização, recursos, disponibilidade e comportamento podem mudar após revisão.</p>
  </article>;
}
