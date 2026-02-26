import { apiJson } from "./api";

export const TOKEN_KEY = "lumen_token";

export type AuthUser = { id: string; name: string; email: string; createdAt: string };
export type AuthResponse = { user: AuthUser; token: string };

export const saveToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export function register(name: string, email: string, password: string, confirmPassword: string) {
  return apiJson<AuthResponse>("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, confirmPassword }),
  });
}

export function login(email: string, password: string) {
  return apiJson<AuthResponse>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export function me(token: string) {
  return apiJson<{ user: AuthUser }>("/auth/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}