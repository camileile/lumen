import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "path";

// Força o carregamento do .env da raiz, não importa onde o processo comece
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// ensure DATABASE_URL is defined before creating the client
if (!process.env.DATABASE_URL) {
  throw new Error("Missing DATABASE_URL in .env");
}

const databaseUrl: string = process.env.DATABASE_URL;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
    }
  }
});

export default prisma;