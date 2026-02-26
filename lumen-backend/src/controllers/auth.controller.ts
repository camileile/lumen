import type { Request, Response } from "express";
import { login, me, register } from "../service/auth.service";
import type { AuthedRequest } from "../middleware/auth.middleware";

export async function registerController(req: Request, res: Response) {
  const { name, email, password } = req.body as { name: string; email: string; password: string };
  const data = await register(name, email, password);
  return res.status(201).json(data);
}

export async function loginController(req: Request, res: Response) {
  const { email, password } = req.body as { email: string; password: string };
  const data = await login(email, password);
  return res.json(data);
}

export async function meController(req: AuthedRequest, res: Response) {
  const userId = req.userId!;
  const user = await me(userId);
  return res.json({ user });
}