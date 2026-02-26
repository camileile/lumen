"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { login,saveToken } from "@/app/lib/auth";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  
  // Estados para os campos e erros
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(""); // Limpa erros anteriores

    try {
      const { token } = await login(email, password);
      saveToken(token);
      router.push("/dashboard");
    } catch (e: any) {
      setError(e.message || "Erro ao realizar login");
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <img src="/logo-lumen.png" alt="Lumen" />
          <strong>Lumen</strong>
        </div>

        <h1 className={styles.title}>Entrar</h1>
        <p className={styles.subtitle}>
          Acesse seu histórico e análises.
        </p>

        <form onSubmit={onSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              className={styles.input}
              type="email"
              placeholder="seuemail@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Senha</label>
            <div className={styles.passwordWrap}>
              <input
                className={styles.input}
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className={styles.showBtn}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <p style={{ color: "red", fontSize: "14px", marginBottom: "10px" }}>{error}</p>}

          <button className={styles.primaryBtn} type="submit">
            Entrar
          </button>

          <div className={styles.divider}>ou</div>

          <button className={styles.secondaryBtn} type="button">
            Entrar com Google
          </button>

          <p className={styles.bottom}>
            Não tem conta? <a href="/cadastro">Criar conta</a>
          </p>
        </form>
      </div>
    </div>
  );
}