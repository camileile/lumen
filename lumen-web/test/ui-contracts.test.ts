import assert from "node:assert/strict";
import test from "node:test";
import { SITE_LINKS } from "../src/app/lib/site-navigation";
import { CATEGORY_PRESENTATION, SCORE_EXPLANATION_COPY } from "../src/app/lib/ui";

test("score explanation states the observation window and limits", () => {
  assert.match(SCORE_EXPLANATION_COPY, /20 observações/);
  assert.match(SCORE_EXPLANATION_COPY, /Não é checagem factual/);
  assert.match(SCORE_EXPLANATION_COPY, /probabilidade matemática/);
});

test("category B is not presented as confirmed trust", () => {
  assert.match(CATEGORY_PRESENTATION.B.label, /desconhecida/);
  assert.match(CATEGORY_PRESENTATION.B.description, /evidência insuficiente/);
  assert.doesNotMatch(CATEGORY_PRESENTATION.B.description, /confiável|comprovad/i);
});

test("public navigation uses real internal destinations", () => {
  assert.ok(SITE_LINKS.every(({ href }) => href.startsWith("/") && !href.endsWith("/#")));
  assert.ok(SITE_LINKS.some(({ href }) => href === "/privacy"));
  assert.ok(SITE_LINKS.some(({ href }) => href === "/terms"));
});
