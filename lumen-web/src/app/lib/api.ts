const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export async function apiJson<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, init);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) throw new Error((data as any)?.error ?? "Erro");
  return data as T;
}