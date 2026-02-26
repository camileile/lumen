import { Request, Response } from "express";

export const analyzeController = async (req: Request, res: Response) => {
  try {
    // Sua lógica de análise virá aqui
    return res.status(200).json({ message: "Análise processada com sucesso!" });
  } catch (error) {
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
};