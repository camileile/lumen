"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { getDialogKeyAction, restoreFocus } from "../../lib/ui";

export type TourStep = { id: string; title: string; text: string; anchor: "score" | "distribution" | "history" | "actions" };
const FOCUSABLE = "button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex='-1'])";

export function TutorialDialog({ step, steps, styles, onStep, onClose }: {
  step: number;
  steps: TourStep[];
  styles: Readonly<Record<string, string>>;
  onStep: (step: number) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const current = steps[step];

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    return () => restoreFocus(previousFocusRef.current);
  }, []);

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    const activeIndex = focusable.indexOf(document.activeElement as HTMLElement);
    const action = getDialogKeyAction(event.key, event.shiftKey, activeIndex, focusable.length);
    if (action === "close") { event.preventDefault(); onClose(); }
    if (typeof action === "number") { event.preventDefault(); focusable[action]?.focus(); }
  }

  return <div className={styles.tourOverlay}>
    <div ref={dialogRef} className={styles.tourCard} role="dialog" aria-modal="true"
      aria-labelledby="tutorial-title" aria-describedby="tutorial-description" onKeyDown={onKeyDown}>
      <button type="button" className={styles.tourClose} onClick={onClose} aria-label="Fechar tutorial"><X size={18} aria-hidden="true" /></button>
      <h2 id="tutorial-title" className={styles.tourTitle}>{current.title}</h2>
      <p id="tutorial-description" className={styles.tourText}>{current.text}</p>
      <div className={styles.tourFooter}>
        <span className={styles.tourSteps}>Etapa {step + 1} de {steps.length}</span>
        <div className={styles.tourBtns}>
          <button className={styles.tourGhost} type="button" onClick={() => onStep(Math.max(0, step - 1))} disabled={step === 0}>Voltar</button>
          {step < steps.length - 1
            ? <button className={styles.tourPrimary} type="button" onClick={() => onStep(Math.min(steps.length - 1, step + 1))}>Próximo</button>
            : <button className={styles.tourPrimary} type="button" onClick={onClose}>Entendi</button>}
        </div>
      </div>
    </div>
  </div>;
}
