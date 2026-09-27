import { isIP } from "node:net";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata.google.internal.",
  "instance-data.ec2.internal",
]);

function parseIpv4(value: string): number[] | null {
  if (isIP(value) !== 4) return null;
  return value.split(".").map(Number);
}

export function isForbiddenIpAddress(value: string): boolean {
  const normalized = value.trim().toLowerCase().replace(/^\[|\]$/g, "");
  const ipv4 = parseIpv4(normalized);

  if (ipv4) {
    const [a, b] = ipv4;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }

  if (isIP(normalized) !== 6) return false;
  if (normalized === "::" || normalized === "::1") return true;

  const mappedHex = normalized.match(/^(?:::ffff:|(?:0+:){5}ffff:)([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mappedHex) {
    const high = Number.parseInt(mappedHex[1], 16);
    const low = Number.parseInt(mappedHex[2], 16);
    return isForbiddenIpAddress(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
  }
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (/^fe[89ab]/.test(normalized)) return true;
  if (normalized.startsWith("ff")) return true;

  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return mapped ? isForbiddenIpAddress(mapped[1]) : false;
}

export function isForbiddenHostname(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (!normalized) return true;
  if (BLOCKED_HOSTNAMES.has(normalized)) return true;
  if ([".localhost", ".local", ".internal", ".lan", ".home", ".corp"].some((suffix) => normalized.endsWith(suffix))) return true;
  if (isIP(normalized) === 0 && !normalized.includes(".")) return true;
  return isForbiddenIpAddress(normalized);
}

export function validateResolvedAddresses(addresses: readonly string[]): boolean {
  return addresses.length > 0 && addresses.every((address) => {
    const normalized = address.trim().replace(/^\[|\]$/g, "");
    return isIP(normalized) !== 0 && !isForbiddenIpAddress(normalized);
  });
}
