import type { CorsOptions } from "cors";
import { AppError } from "./app-error";

export function allowedCorsOrigins(raw = process.env.CORS_ORIGIN ?? "http://localhost:3001"): Set<string> {
  const origins = raw.split(",").map((value) => value.trim()).filter(Boolean);
  if (origins.length === 0 || origins.includes("*")) {
    throw new Error("CORS_ORIGIN must contain explicit HTTP(S) origins");
  }

  return new Set(origins.map((origin) => {
    const parsed = new URL(origin);
    if ((parsed.protocol !== "http:" && parsed.protocol !== "https:") || parsed.origin !== origin) {
      throw new Error("CORS_ORIGIN must contain origins without paths, queries, or fragments");
    }
    return parsed.origin;
  }));
}

export function createCorsOptions(origins = allowedCorsOrigins()): CorsOptions {
  return {
    credentials: false,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 600,
    origin(origin, callback) {
      if (!origin || origins.has(origin)) return callback(null, true);
      return callback(new AppError(403, "CORS_ORIGIN_DENIED", "Origem não permitida"));
    },
  };
}
