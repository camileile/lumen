import "dotenv/config";
import express from "express";
import cors from "cors";
import routes from "./routes";
import { errorMiddleware } from "./middleware/error.middleware";

export const app = express();

app.use(cors({ origin: "http://localhost:3001" }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use(routes);

app.use(errorMiddleware);