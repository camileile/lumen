"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { register,saveToken } from "@/app/lib/auth"; 
import styles from "./cadastro.module.css";

export default function CadastroPage() {
  const router = useRouter();

  // Estados para visibilidade das senhas
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Estados para os campos do formulário
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    // Validação básica de cliente antes de chamar a API
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    try {
      const { token } = await register(name, email, password, confirmPassword);
      saveToken(token);
      router.push("/dashboard");
    } catch (e: any) {
      setError(e.message || "Erro ao criar conta. Tente novamente.");
    }
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
              placeholder="Seu nome completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

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

          {/* SENHA */}
          <div className={styles.field}>
            <label className={styles.label}>Senha</label>
            <div className={styles.passwordWrap}>
              <input
                className={styles.input}
                type={showPassword ? "text" : "password"}
                placeholder="Crie uma senha"
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

          {/* CONFIRMAR SENHA */}
          <div className={styles.field}>
            <label className={styles.label}>Confirmar senha</label>
            <div className={styles.passwordWrap}>
              <input
                className={styles.input}
                type={showConfirm ? "text" : "password"}
                placeholder="Confirme sua senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className={styles.showBtn}
                onClick={() => setShowConfirm(!showConfirm)}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <p style={{ color: "#ff4d4d", fontSize: "14px", marginBottom: "15px", textAlign: "center" }}>
              {error}
            </p>
          )}

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