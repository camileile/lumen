import type { NextFunction, Request, Response } from "express";

type Entry = { count: number; resetAt: number };

export type RateLimitOptions = {
  max: number;
  windowMs: number;
  key: (req: Request) => string;
  now?: () => number;
};

export class MemoryRateLimitStore {
  private readonly entries = new Map<string, Entry>();
  private hits = 0;

  hit(key: string, max: number, windowMs: number, now: number) {
    const current = this.entries.get(key);
    const entry = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : current;
    entry.count += 1;
    if (!current && this.entries.size >= 10_000) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey) this.entries.delete(oldestKey);
    }
    this.entries.set(key, entry);

    this.hits += 1;
    if (this.hits % 1_000 === 0) {
      for (const [storedKey, stored] of this.entries) {
        if (stored.resetAt <= now) this.entries.delete(storedKey);
      }
    }

    return {
      allowed: entry.count <= max,
      limit: max,
      remaining: Math.max(0, max - entry.count),
      resetAt: entry.resetAt,
    };
  }

  clear() {
    this.entries.clear();
    this.hits = 0;
  }
}

export function createRateLimiter(options: RateLimitOptions) {
  const store = new MemoryRateLimitStore();
  const now = options.now ?? Date.now;

  const middleware = (req: Request, res: Response, next: NextFunction) => {
    const result = store.hit(options.key(req), options.max, options.windowMs, now());
    const resetSeconds = Math.max(0, Math.ceil((result.resetAt - now()) / 1000));
    res.setHeader("RateLimit-Limit", String(result.limit));
    res.setHeader("RateLimit-Remaining", String(result.remaining));
    res.setHeader("RateLimit-Reset", String(resetSeconds));

    if (!result.allowed) {
      res.setHeader("Retry-After", String(resetSeconds));
      return res.status(429).json({
        error: "Muitas solicitações. Tente novamente mais tarde.",
        code: "RATE_LIMIT_EXCEEDED",
      });
    }
    return next();
  };

  return Object.assign(middleware, { store });
}

function positiveInteger(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

const ipKey = (req: Request) => req.ip || req.socket.remoteAddress || "unknown";

export const registerRateLimit = createRateLimiter({
  max: positiveInteger("RATE_LIMIT_REGISTER_MAX", 5),
  windowMs: positiveInteger("RATE_LIMIT_REGISTER_WINDOW_SECONDS", 900) * 1000,
  key: ipKey,
});

export const loginRateLimit = createRateLimiter({
  max: positiveInteger("RATE_LIMIT_LOGIN_MAX", 10),
  windowMs: positiveInteger("RATE_LIMIT_LOGIN_WINDOW_SECONDS", 900) * 1000,
  key: ipKey,
});

export const analyzeRateLimit = createRateLimiter({
  max: positiveInteger("RATE_LIMIT_ANALYZE_MAX", 20),
  windowMs: positiveInteger("RATE_LIMIT_ANALYZE_WINDOW_SECONDS", 60) * 1000,
  key: (req) => `${(req as Request & { userId?: string }).userId ?? "anonymous"}:${ipKey(req)}`,
});
