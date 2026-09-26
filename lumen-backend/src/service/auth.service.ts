import bcrypt from "bcrypt";
import prisma from "../db/prisma";
import { AppError } from "../security/app-error";
import { signAccessToken } from "../security/jwt";
import { SAFE_USER_SELECT, safeUserProjection } from "../security/safe-user";

type UserWithPassword = {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: Date | string;
};

async function findUserByEmail(email: string): Promise<UserWithPassword | null> {
  const users = await prisma.$queryRaw<UserWithPassword[]>`
    SELECT "id", "name", "email", "password", "createdAt"
    FROM "User"
    WHERE lower("email") = lower(${email})
    LIMIT 1
  `;
  return users[0] ?? null;
}

export async function register(name: string, email: string, password: string) {
  const normalizedEmail = email.toLowerCase();
  const existing = await findUserByEmail(normalizedEmail);
  if (existing) throw new AppError(409, "EMAIL_ALREADY_REGISTERED", "E-mail já cadastrado");

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { name, email: normalizedEmail, password: passwordHash },
    select: SAFE_USER_SELECT,
  });

  return { user, token: signAccessToken(user.id) };
}

export async function login(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user) throw new AppError(401, "INVALID_CREDENTIALS", "Credenciais inválidas");

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw new AppError(401, "INVALID_CREDENTIALS", "Credenciais inválidas");

  const token = signAccessToken(user.id);

  return {
    user: safeUserProjection({ ...user, createdAt: new Date(user.createdAt) }),
    token,
  };
}

export async function me(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: SAFE_USER_SELECT,
  });
  if (!user) throw new AppError(404, "USER_NOT_FOUND", "Usuário não encontrado");
  return user;
}
