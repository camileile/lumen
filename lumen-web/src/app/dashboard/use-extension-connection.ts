"use client";

import { useCallback, useEffect, useState } from "react";

export type ExtensionConnectionState = "checking" | "missing" | "disconnected" | "connecting" | "connected" | "error";

function requestExtension(type: string, resultType: string, timeoutMs = 1_500) {
  const requestId = crypto.randomUUID().replaceAll("-", "");
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener("message", onMessage);
      reject(new Error("Extension unavailable"));
    }, timeoutMs);
    function onMessage(event: MessageEvent) {
      if (event.source !== window || event.origin !== window.location.origin ||
          event.data?.type !== resultType || event.data?.requestId !== requestId) return;
      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      resolve(event.data as Record<string, unknown>);
    }
    window.addEventListener("message", onMessage);
    window.postMessage({ type, requestId }, window.location.origin);
  });
}

export function useExtensionConnection() {
  const [state, setState] = useState<ExtensionConnectionState>("checking");
  const [identity, setIdentity] = useState("");

  const refresh = useCallback(async () => {
    setState("checking");
    try {
      const result = await requestExtension("LUMEN_ACCOUNT_STATUS_REQUEST", "LUMEN_ACCOUNT_STATUS_RESULT");
      if (result.connected === true) {
        const user = result.user as { email?: string; name?: string } | undefined;
        setIdentity(user?.email || user?.name || "Conta Lumen");
        setState("connected");
      } else {
        setIdentity("");
        setState("disconnected");
      }
    } catch {
      setIdentity("");
      setState("missing");
    }
  }, []);

  useEffect(() => {
    let active = true;
    requestExtension("LUMEN_ACCOUNT_STATUS_REQUEST", "LUMEN_ACCOUNT_STATUS_RESULT")
      .then((result) => {
        if (!active) return;
        if (result.connected === true) {
          const user = result.user as { email?: string; name?: string } | undefined;
          setIdentity(user?.email || user?.name || "Conta Lumen");
          setState("connected");
        } else {
          setState("disconnected");
        }
      })
      .catch(() => { if (active) setState("missing"); });
    return () => { active = false; };
  }, []);

  const connect = useCallback(async () => {
    if (state === "connecting" || state === "connected") return;
    setState("connecting");
    try {
      const result = await requestExtension("LUMEN_START_ACCOUNT_CONNECTION", "LUMEN_START_ACCOUNT_RESULT", 5_000);
      setState(result.ok === true ? "disconnected" : "error");
    } catch {
      setState("error");
    }
  }, [state]);

  return { state, identity, connect, refresh };
}
