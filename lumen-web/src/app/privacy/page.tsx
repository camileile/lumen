import type { Metadata } from "next";
import styles from "../legal.module.css";

export const metadata: Metadata = { title: "Privacidade" };

export default function PrivacyPage() {
  return <article className={styles.page}>
    <h1>Privacidade</h1>
    <p className={styles.notice}>Esta página descreve o comportamento técnico atual do projeto em desenvolvimento; não substitui uma política jurídica definitiva.</p>
    <h2>Dados processados</h2>
    <p>Quando conectado, o Lumen processa uma versão minimizada da URL e o domínio visitado para gerar e registrar sinais automatizados. Fragmentos, credenciais e parâmetros de consulta sensíveis conhecidos são removidos.</p>
    <h2>Serviço externo</h2>
    <p>A URL minimizada e o domínio podem ser enviados à API e ao provedor OpenRouter. O Lumen atual não busca nem lê o texto completo da página.</p>
    <h2>Limitações atuais</h2>
    <p>O histórico ainda não possui controles de exclusão ou retenção na interface. Não inclua informações pessoais ou segredos em URLs analisadas.</p>
  </article>;
}
