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
    <p>Em novas análises, somente o domínio/origem minimizado é enviado à API e ao provedor OpenRouter. Caminho, query e fragmento não são persistidos nem enviados ao provedor. O Lumen atual não busca nem lê o texto completo da página.</p>
    <p>A observação automática da extensão começa desativada e, quando ativada, é limitada às fontes reconhecidas pela lista local. Outras páginas só são analisadas após uma ação explícita.</p>
    <p>O histórico pode ser excluído permanentemente no dashboard. Uma política automática de retenção ainda não foi definida.</p>
    <h2>Limitações atuais</h2>
    <p>Registros históricos anteriores podem conter caminhos sanitizados. A exclusão está disponível no dashboard, mas ainda não existe uma política automática de retenção nem exclusão de conta. Não inclua informações pessoais ou segredos em URLs analisadas.</p>
  </article>;
}
