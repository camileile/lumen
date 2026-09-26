import type { Category } from "./score";

const SOURCE_CATEGORIES = {
  A: ["bbc.com", "reuters.com", "apnews.com", "nytimes.com", "theguardian.com"],
  B: ["gov.br", "un.org", "who.int", "ibge.gov.br"],
  C: ["metropoles.com", "r7.com", "terra.com.br"],
  D: ["infowars.com", "naturalnews.com"],
} as const satisfies Record<Category, readonly string[]>;

export type SourceClassification = {
  category: Category;
  knownSource: boolean;
};

export function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
}

export function hostnameFromHttpUrl(value: string): string | null {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

    const hostname = normalizeHostname(parsed.hostname);
    return hostname || null;
  } catch {
    return null;
  }
}

function matchesSource(hostname: string, source: string): boolean {
  return hostname === source || hostname.endsWith(`.${source}`);
}

export function classifyHostname(hostname: string): SourceClassification {
  const normalized = normalizeHostname(hostname);

  for (const category of ["A", "B", "C", "D"] as const) {
    if (SOURCE_CATEGORIES[category].some((source) => matchesSource(normalized, source))) {
      return { category, knownSource: true };
    }
  }

  return { category: "B", knownSource: false };
}
