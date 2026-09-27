"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clearToken, getToken, me, type AuthUser } from "@/app/lib/auth";
import { getHistory } from "@/app/lib/history";
import { mapHistoryToDashboard } from "@/app/lib/dashboardData";
import { getDashboardMock } from "@/app/lib/dashboardMock";
import type { DashboardData } from "@/app/lib/types";

const DEMO_KEY = "lumen_demo_v1";

export function useDashboardData() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [demo, setDemo] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    const nextDemo = localStorage.getItem(DEMO_KEY) === "1";
    setDemo(nextDemo);
    setReady(true);

    me(token).then(({ user: nextUser }) => setUser(nextUser)).catch(() => {
      clearToken();
      router.replace("/login");
    });
  }, [router]);

  const refresh = useCallback(async () => {
    if (!getToken()) return;
    setLoading(true);
    setError("");
    try {
      setDashboardData(mapHistoryToDashboard(await getHistory()));
    } catch {
      setDashboardData(null);
      setError("Não foi possível carregar os dados agora. Verifique sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ready && user && !demo) void refresh();
  }, [demo, ready, refresh, user]);

  const setDemoMode = useCallback((enabled: boolean) => {
    localStorage.setItem(DEMO_KEY, enabled ? "1" : "0");
    setError("");
    setDemo(enabled);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    router.replace("/login");
  }, [router]);

  const data = useMemo(() => demo ? getDashboardMock(false) : dashboardData ?? getDashboardMock(true), [dashboardData, demo]);

  return { user, ready, demo, data, hasLoaded: dashboardData !== null, loading, error, refresh, setDemoMode, logout };
}
