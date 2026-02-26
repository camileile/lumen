import { Request, Response } from "express";
import prisma from "../db/prisma"; // Verifique se criou src/db/prisma.ts

export const register = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.create({
      data: { email, password }
    });
    return res.status(201).json(user);
  } catch (error) {
    return res.status(400).json({ error: "Erro ao criar usuário" });
  }
};

export const login = async (req: Request, res: Response) => {
  // Por enquanto, apenas para não dar erro no import
  return res.json({ message: "Login funcional" });
};