"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthSubmitButton, FormAlert, PasswordField } from "@/app/components/auth-controls";
import { login, saveToken } from "@/app/lib/auth";
import { safeLoginReturnPath } from "@/app/lib/extensionAuth";
import styles from "@/app/components/auth.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setError("");
    setSubmitting(true);

    try {
      const { token } = await login(email, password);
      saveToken(token);
      router.replace(safeLoginReturnPath(new URLSearchParams(window.location.search).get("next")));
    } catch {
      setError("Não foi possível entrar. Verifique suas credenciais ou tente novamente em instantes.");
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <Image src="/logo-lumen.png" alt="" width={28} height={28} />
          <strong>Lumen</strong>
        </div>

        <h1 className={styles.title}>Entrar</h1>
        <p className={styles.subtitle}>
          Acesse seu histórico e suas estimativas automatizadas.
        </p>

        <form onSubmit={onSubmit} aria-busy={submitting}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="login-email">Email</label>
            <input
              className={styles.input}
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={254}
              disabled={submitting}
              required
            />
          </div>

          <div className={styles.field}>
            <PasswordField
              id="login-password"
              label="Senha"
              name="password"
              autoComplete="current-password"
              value={password}
              visible={showPassword}
              disabled={submitting}
              styles={styles}
              onChange={setPassword}
              onToggle={() => setShowPassword((visible) => !visible)}
            />
          </div>

          <FormAlert message={error} className={styles.error} />
          <AuthSubmitButton
            idleLabel="Entrar"
            loadingLabel="Entrando…"
            submitting={submitting}
            className={styles.primaryBtn}
          />

          <p className={styles.bottom}>
            Não tem conta? <Link href="/cadastro">Criar conta</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
