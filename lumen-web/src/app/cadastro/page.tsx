"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import styles from "./cadastro.module.css";

export default function CadastroPage() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // MOCK (sem backend)
    router.push("/dashboard");
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <img src="/logo-lumen.png" alt="Lumen" />
          <strong>Lumen</strong>
        </div>

        <h1 className={styles.title}>Criar conta</h1>
        <p className={styles.subtitle}>
          Cadastre-se para acompanhar seu histórico e análises.
        </p>

        <form onSubmit={onSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>Nome completo</label>
            <input
              className={styles.input}
              type="text"
              name="name"
              placeholder="Seu nome completo"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              className={styles.input}
              type="email"
              name="email"
              placeholder="seuemail@gmail.com"
              required
            />
          </div>

          {/* SENHA */}
          <div className={styles.field}>
            <label className={styles.label}>Senha</label>

            <div className={styles.passwordWrap}>
              <input
                className={styles.input}
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Crie uma senha"
                required
              />

              <button
                type="button"
                className={styles.showBtn}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          {/* CONFIRMAR SENHA */}
          <div className={styles.field}>
            <label className={styles.label}>Confirmar senha</label>

            <div className={styles.passwordWrap}>
              <input
                className={styles.input}
                type={showConfirm ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirme sua senha"
                required
              />

              <button
                type="button"
                className={styles.showBtn}
                onClick={() => setShowConfirm(!showConfirm)}
              >
                {showConfirm ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          <button className={styles.primaryBtn} type="submit">
            Criar conta
          </button>

          <div className={styles.divider}>ou</div>

          <button className={styles.secondaryBtn} type="button">
            Criar com Google
          </button>

          <p className={styles.bottom}>
            Já tem conta? <a href="/login">Entrar</a>
          </p>
        </form>
      </div>
    </div>
  );
}