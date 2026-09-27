"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { getToken, me, type AuthUser } from "@/app/lib/auth";
import { createExtensionAuthorization, parseExtensionConnectRequest } from "@/app/lib/extensionAuth";
import styles from "./connect.module.css";

type Phase = "detecting" | "ready" | "submitting" | "connected" | "error";

function waitForMessage(type: string, requestId: string, timeoutMs = 5_000) {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener("message", onMessage);
      reject(new Error("Extension response timeout"));
    }, timeoutMs);
    function onMessage(event: MessageEvent) {
      if (event.source !== window || event.origin !== window.location.origin ||
          event.data?.type !== type || event.data?.requestId !== requestId) return;
      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      resolve(event.data as Record<string, unknown>);
    }
    window.addEventListener("message", onMessage);
  });
}

function ExtensionConnectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const request = useMemo(() => parseExtensionConnectRequest(searchParams), [searchParams]);
  const [phase, setPhase] = useState<Phase>("detecting");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [bridgeChallenge, setBridgeChallenge] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!request) {
      setPhase("error");
      setMessage("Esta solicitação de conexão é inválida ou expirou.");
      return;
    }
    const token = getToken();
    if (!token) {
      router.replace(`/login?next=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`);
      return;
    }

    let cancelled = false;
    const bridgeResponse = waitForMessage("LUMEN_CONNECT_CHALLENGE", request.requestId);
    window.postMessage({ type: "LUMEN_CONNECT_REQUEST", ...request }, window.location.origin);
    Promise.all([me(token), bridgeResponse]).then(([identity, response]) => {
      if (cancelled || typeof response.challenge !== "string") return;
      setUser(identity.user);
      setBridgeChallenge(response.challenge);
      setPhase("ready");
    }).catch(() => {
      if (!cancelled) {
        setPhase("error");
        setMessage("A extensão não foi detectada ou a solicitação expirou. Inicie novamente pelo popup da extensão.");
      }
    });
    return () => { cancelled = true; };
  }, [request, router]);

  async function confirm() {
    const token = getToken();
    if (!request || !token || !bridgeChallenge || phase === "submitting") return;
    setPhase("submitting");
    try {
      const pendingResult = waitForMessage("LUMEN_CONNECT_RESULT", request.requestId);
      const authorization = await createExtensionAuthorization(token, request);
      window.postMessage({
        type: "LUMEN_CONNECT_COMMIT",
        ...request,
        challenge: bridgeChallenge,
        authorizationCode: authorization.authorizationCode,
      }, window.location.origin);
      const result = await pendingResult;
      if (result.ok !== true) throw new Error("Extension rejected authorization");
      setPhase("connected");
    } catch {
      setPhase("error");
      setMessage("Não foi possível concluir a conexão. Inicie uma nova tentativa pela extensão.");
    }
  }

  return <main className={styles.page}>
    <section className={styles.card} aria-labelledby="connect-title">
      <span className={styles.eyebrow}>Extensão Lumen</span>
      <h1 id="connect-title">Conectar esta extensão?</h1>
      {phase === "detecting" && <p role="status">Validando a solicitação segura…</p>}
      {phase === "ready" && <>
        <p>A extensão deste dispositivo terá uma sessão própria para acessar o histórico da conta.</p>
        <p className={styles.identity}>Conta: <strong>{user?.email}</strong></p>
        <div className={styles.actions}>
          <button type="button" onClick={confirm}>Conectar extensão</button>
          <Link href="/dashboard">Cancelar</Link>
        </div>
      </>}
      {phase === "submitting" && <p role="status">Conectando com segurança…</p>}
      {phase === "connected" && <><p role="status" className={styles.success}>Extensão conectada.</p><Link href="/dashboard">Voltar ao dashboard</Link></>}
      {phase === "error" && <><p role="alert" className={styles.error}>{message}</p><Link href="/dashboard">Voltar ao dashboard</Link></>}
      <small>O Lumen não envia sua senha nem a sessão do navegador para a extensão.</small>
    </section>
  </main>;
}

export default function ExtensionConnectPage() {
  return <Suspense fallback={<main className={styles.page}><section className={styles.card}><p>Preparando conexão…</p></section></main>}>
    <ExtensionConnectContent />
  </Suspense>;
}
