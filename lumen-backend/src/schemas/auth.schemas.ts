import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(3).max(100),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(6).max(128),
  confirmPassword: z.string().min(6).max(128),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});
