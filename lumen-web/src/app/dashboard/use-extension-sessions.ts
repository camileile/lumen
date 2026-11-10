"use client";

import { useCallback, useEffect, useState } from "react";
import { getToken } from "@/app/lib/auth";
import {
  getExtensionSessions,
  revokeExtensionSession,
  type ExtensionSessionSummary,
} from "@/app/lib/extensionAuth";

export function useExtensionSessions(enabled: boolean) {
  const [sessions, setSessions] = useState<ExtensionSessionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [revokingId, setRevokingId] = useState("");

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token || !enabled) return;
    setLoading(true);
    setError("");
    try {
      setSessions((await getExtensionSessions(token)).sessions);
    } catch {
      setError("Não foi possível carregar as extensões conectadas.");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  const revoke = useCallback(async (sessionId: string) => {
    const token = getToken();
    if (!token) return;
    setRevokingId(sessionId);
    setError("");
    try {
      await revokeExtensionSession(token, sessionId);
      await refresh();
    } catch {
      setError("Não foi possível revogar esta extensão.");
    } finally {
      setRevokingId("");
    }
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return;
    const frame = window.requestAnimationFrame(() => void refresh());
    return () => window.cancelAnimationFrame(frame);
  }, [enabled, refresh]);

  return { sessions, loading, error, revokingId, refresh, revoke };
}
