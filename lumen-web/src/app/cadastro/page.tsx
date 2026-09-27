"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthSubmitButton, FormAlert, PasswordField } from "@/app/components/auth-controls";
import { register, saveToken } from "@/app/lib/auth";
import styles from "@/app/components/auth.module.css";

export default function CadastroPage() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setError("");

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setSubmitting(true);
    try {
      const { token } = await register(name, email, password, confirmPassword);
      saveToken(token);
      router.replace("/dashboard");
    } catch {
      setError("Não foi possível criar a conta. Revise os dados ou tente novamente em instantes.");
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

        <h1 className={styles.title}>Criar conta</h1>
        <p className={styles.subtitle}>
          Cadastre-se para acompanhar seu histórico e suas estimativas.
        </p>

        <form onSubmit={onSubmit} aria-busy={submitting}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="register-name">Nome completo</label>
            <input
              className={styles.input}
              id="register-name"
              name="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              minLength={3}
              maxLength={80}
              disabled={submitting}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="register-email">Email</label>
            <input
              className={styles.input}
              id="register-email"
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
            <PasswordField id="register-password" label="Senha" name="password" autoComplete="new-password"
              value={password} visible={showPassword} disabled={submitting} styles={styles}
              onChange={setPassword} onToggle={() => setShowPassword((visible) => !visible)} />
          </div>

          <div className={styles.field}>
            <PasswordField id="register-confirm-password" label="Confirmar senha" name="confirmPassword"
              autoComplete="new-password" value={confirmPassword} visible={showConfirm} disabled={submitting}
              styles={styles} onChange={setConfirmPassword} onToggle={() => setShowConfirm((visible) => !visible)} />
          </div>

          <FormAlert message={error} className={styles.error} />
          <AuthSubmitButton idleLabel="Criar conta" loadingLabel="Criando conta…" submitting={submitting}
            className={styles.primaryBtn} />

          <p className={styles.bottom}>
            Já tem conta? <Link href="/login">Entrar</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
