import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "path";

// Força o carregamento do .env da raiz, não importa onde o processo comece
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

export default prisma;