import { Request, Response } from "express";

export const getHistory = async (req: Request, res: Response) => {
  try {
    // Lógica para buscar histórico no banco
    return res.status(200).json({ history: [] });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar histórico" });
  }
};