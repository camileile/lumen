import "dotenv/config";
import express from "express";
import cors from "cors";
import routes from "./routes";
import { errorMiddleware } from "./middleware/error.middleware";
import { createCorsOptions } from "./security/cors";
import { requestContext, securityHeaders } from "./middleware/security.middleware";

export const app = express();

app.disable("x-powered-by");
if (process.env.TRUST_PROXY_HOPS) {
  const hops = Number(process.env.TRUST_PROXY_HOPS);
  if (Number.isSafeInteger(hops) && hops > 0) app.set("trust proxy", hops);
}
app.use(requestContext);
app.use(securityHeaders);
app.use(cors(createCorsOptions()));
app.use(express.json({ limit: process.env.REQUEST_BODY_LIMIT ?? "16kb", strict: true }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use(routes);

app.use(errorMiddleware);
