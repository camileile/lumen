import { Eye, EyeOff } from "lucide-react";

type AuthStyles = Readonly<Record<string, string>>;

export function PasswordField({ id, label, name, autoComplete, value, visible, disabled, styles, onChange, onToggle }: {
  id: string;
  label: string;
  name: string;
  autoComplete: "current-password" | "new-password";
  value: string;
  visible: boolean;
  disabled: boolean;
  styles: AuthStyles;
  onChange: (value: string) => void;
  onToggle: () => void;
}) {
  const actionLabel = visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`;
  return (
    <>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <div className={styles.passwordWrap}>
        <input className={styles.input} id={id} name={name} type={visible ? "text" : "password"}
          autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value)}
          minLength={6} maxLength={128} disabled={disabled} required />
        <button type="button" className={styles.showBtn} onClick={onToggle} aria-label={actionLabel}
          aria-pressed={visible} disabled={disabled}>
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
    </>
  );
}

export function FormAlert({ message, className }: { message: string; className: string }) {
  if (!message) return null;
  return <p className={className} role="alert" aria-live="assertive">{message}</p>;
}

export function AuthSubmitButton({ idleLabel, loadingLabel, submitting, className }: {
  idleLabel: string;
  loadingLabel: string;
  submitting: boolean;
  className: string;
}) {
  return <button className={className} type="submit" disabled={submitting} aria-busy={submitting}>
    {submitting ? loadingLabel : idleLabel}
  </button>;
}
