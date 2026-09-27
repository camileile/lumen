import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AuthSubmitButton, FormAlert, PasswordField } from "../src/app/components/auth-controls";
import { TutorialDialog, type TourStep } from "../src/app/dashboard/components/tutorial-dialog";
import { getDialogKeyAction, restoreFocus } from "../src/app/lib/ui";

const authStyles = { label: "label", input: "input", passwordWrap: "wrap", showBtn: "toggle" };
const dialogStyles = new Proxy({}, { get: (_, key) => String(key) }) as Record<string, string>;
const noop = () => undefined;

test("password field associates label, id, name, and autocomplete", () => {
  const html = renderToStaticMarkup(<PasswordField id="login-password" label="Senha" name="password"
    autoComplete="current-password" value="" visible={false} disabled={false} styles={authStyles}
    onChange={noop} onToggle={noop} />);
  assert.match(html, /<label[^>]*for="login-password"/);
  assert.match(html, /id="login-password"/);
  assert.match(html, /name="password"/);
  assert.match(html, /autoComplete="current-password"/);
});

test("password toggle exposes its accessible state", () => {
  const html = renderToStaticMarkup(<PasswordField id="password" label="Senha" name="password"
    autoComplete="new-password" value="secret" visible={false} disabled={false} styles={authStyles}
    onChange={noop} onToggle={noop} />);
  assert.match(html, /aria-label="Mostrar senha"/);
  assert.match(html, /aria-pressed="false"/);
});

test("visible password toggle announces the hide action", () => {
  const html = renderToStaticMarkup(<PasswordField id="password" label="Senha" name="password"
    autoComplete="new-password" value="secret" visible disabled={false} styles={authStyles}
    onChange={noop} onToggle={noop} />);
  assert.match(html, /aria-label="Ocultar senha"/);
  assert.match(html, /aria-pressed="true"/);
});

test("form errors are assertive accessible alerts", () => {
  const html = renderToStaticMarkup(<FormAlert message="Falha de teste" className="error" />);
  assert.match(html, /role="alert"/);
  assert.match(html, /aria-live="assertive"/);
});

test("loading submit button is disabled and busy", () => {
  const html = renderToStaticMarkup(<AuthSubmitButton idleLabel="Entrar" loadingLabel="Entrando…"
    submitting className="submit" />);
  assert.match(html, /disabled=""/);
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /Entrando/);
});

test("tutorial exposes dialog semantics", () => {
  const steps: TourStep[] = [{ id: "one", anchor: "score", title: "Título", text: "Descrição" }];
  const html = renderToStaticMarkup(<TutorialDialog step={0} steps={steps} styles={dialogStyles}
    onStep={noop} onClose={noop} />);
  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /aria-labelledby="tutorial-title"/);
  assert.match(html, /aria-describedby="tutorial-description"/);
});

test("Escape maps to dialog close", () => {
  assert.equal(getDialogKeyAction("Escape", false, 0, 3), "close");
});

test("Tab wraps focus from the last to the first control", () => {
  assert.equal(getDialogKeyAction("Tab", false, 2, 3), 0);
});

test("Shift+Tab wraps focus from the first to the last control", () => {
  assert.equal(getDialogKeyAction("Tab", true, 0, 3), 2);
});

test("closing a dialog restores focus", () => {
  let focused = false;
  restoreFocus({ focus: () => { focused = true; } });
  assert.equal(focused, true);
});
