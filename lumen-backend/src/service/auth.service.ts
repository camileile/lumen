import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../db/prisma";

// ALTERAÇÃO AQUI: Passando o userId direto no objeto do payload
function signToken(userId: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET não configurado");
  
  // Agora o token carrega { userId: "..." }
  return jwt.sign({ userId }, secret, { expiresIn: "7d" });
}

export async function register(name: string, email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("E-mail já cadastrado");

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { name, email, password: passwordHash },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  return { user, token: signToken(user.id) };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("Credenciais inválidas");

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw new Error("Credenciais inválidas");

  const token = signToken(user.id);

  return {
    user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt },
    token,
  };
}

export async function me(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, createdAt: true },
  });
  if (!user) throw new Error("Usuário não encontrado");
  return user;
}