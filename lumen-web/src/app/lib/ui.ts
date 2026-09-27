import type { LabelABCD } from "./types";

export const SCORE_EXPLANATION_COPY =
  "Estimativa automatizada baseada em até 20 observações recentes de categorias de fonte e domínio. Não é checagem factual nem probabilidade matemática de verdade.";

export const CATEGORY_PRESENTATION: Record<LabelABCD, { label: string; description: string }> = {
  A: { label: "Categoria A — referência", description: "Sinal de fonte de referência; não comprova a veracidade de um artigo." },
  B: { label: "Categoria B — neutra ou desconhecida", description: "Pode representar fonte neutra, desconhecida ou evidência insuficiente." },
  C: { label: "Categoria C — atenção editorial", description: "Indica sinais de sensacionalismo ou menor qualidade editorial." },
  D: { label: "Categoria D — maior risco", description: "Indica sinais de maior risco na fonte; não é um veredito factual." },
};

export type DialogKeyAction = "close" | number | null;

export function getDialogKeyAction(key: string, shiftKey: boolean, activeIndex: number, focusableCount: number): DialogKeyAction {
  if (key === "Escape") return "close";
  if (key !== "Tab" || focusableCount < 1) return null;
  if (shiftKey && activeIndex <= 0) return focusableCount - 1;
  if (!shiftKey && activeIndex >= focusableCount - 1) return 0;
  return null;
}

export function restoreFocus(target: { focus: () => void } | null) {
  target?.focus();
}
