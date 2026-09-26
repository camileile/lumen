import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { apiJson } from "../src/app/lib/api";

const nativeFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = nativeFetch;
  delete process.env.NEXT_PUBLIC_API_URL;
});

test("apiJson returns parsed data for a successful response", async () => {
  process.env.NEXT_PUBLIC_API_URL = "https://api.example.invalid";
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  assert.deepEqual(await apiJson<{ ok: boolean }>("/history"), { ok: true });
});

test("apiJson exposes the safe API error message", async () => {
  process.env.NEXT_PUBLIC_API_URL = "https://api.example.invalid";
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: "Synthetic API failure" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });

  await assert.rejects(() => apiJson("/history"), /Synthetic API failure/);
});

test("apiJson fails clearly when the API URL is not configured", async () => {
  await assert.rejects(() => apiJson("/history"), /NEXT_PUBLIC_API_URL não configurado/);
});
