export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) throw new Error("NEXT_PUBLIC_API_URL não configurado");

  const res = await fetch(`${base}${path}`, {
    ...init,
    cache: "no-store", // ✅ força sempre buscar do servidor
    headers: {
      ...(init?.headers || {}),
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });

  const data: unknown = await res.json().catch(() => ({}));
  const apiError =
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof data.error === "string"
      ? data.error
      : undefined;

  if (!res.ok) throw new Error(apiError || `HTTP ${res.status}`);
  return data as T;
}
