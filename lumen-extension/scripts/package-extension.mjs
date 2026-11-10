import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deflateRawSync } from "node:zlib";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const extensionRoot = path.resolve(scriptDirectory, "..");

function argument(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function exactOrigin(value, name, requireHttps) {
  if (!value) throw new Error(`Missing --${name}`);
  const parsed = new URL(value);
  if ((requireHttps && parsed.protocol !== "https:") ||
      (!requireHttps && !["http:", "https:"].includes(parsed.protocol)) ||
      parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error(`--${name} must be an exact ${requireHttps ? "HTTPS " : "HTTP(S) "}origin`);
  }
  return parsed.origin;
}

export function normalizeRuntimeText(data) {
  return Buffer.from(Buffer.from(data).toString("utf8").replace(/\r\n?/g, "\n"));
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const dosTime = 0;
  const dosDate = (40 << 9) | (1 << 5) | 1; // 2020-01-01 UTC

  for (const entry of entries) {
    const name = Buffer.from(entry.name.replaceAll("\\", "/"), "utf8");
    const data = Buffer.from(entry.data);
    const compressed = deflateRawSync(data, { level: 9 });
    const checksum = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    localParts.push(local, name, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(0x0314, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(dosTime, 12);
    central.writeUInt16LE(dosDate, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);
    offset += local.length + name.length + compressed.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...localParts, centralDirectory, end]);
}

export async function packageExtension(options) {
  const production = options.channel === "production";
  if (!production && options.channel !== "development") throw new Error("--channel must be development or production");
  const apiBaseUrl = exactOrigin(options.apiUrl, "api-url", production);
  const dashboardOrigin = exactOrigin(options.dashboardOrigin, "dashboard-origin", production);
  const runtimeFiles = JSON.parse(await readFile(path.join(extensionRoot, "runtime-files.json"), "utf8"));
  const manifest = JSON.parse(await readFile(path.join(extensionRoot, "manifest.json"), "utf8"));
  manifest.host_permissions = [`${apiBaseUrl}/*`];
  const config = `(function registerLumenConfig(global) {\n  global.LumenConfig = Object.freeze({\n    apiBaseUrl: ${JSON.stringify(apiBaseUrl)},\n    dashboardOrigin: ${JSON.stringify(dashboardOrigin)},\n    buildChannel: ${JSON.stringify(options.channel)},\n  });\n})(globalThis);\n`;

  const entries = [];
  for (const filename of runtimeFiles) {
    let data = filename === "config.js"
      ? Buffer.from(config)
      : filename === "manifest.json"
        ? Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`)
        : await readFile(path.join(extensionRoot, filename));
    if (/\.(?:css|html|js|json)$/i.test(filename)) {
      data = normalizeRuntimeText(data);
    }
    entries.push({ name: filename, data });
  }
  const output = path.resolve(options.output);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, zip(entries));
  return { output, files: entries.length, apiBaseUrl, dashboardOrigin, channel: options.channel };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const channel = argument("channel") ?? "development";
  const result = await packageExtension({
    channel,
    apiUrl: argument("api-url") ?? (channel === "development" ? "http://localhost:3000" : undefined),
    dashboardOrigin: argument("dashboard-origin") ?? (channel === "development" ? "http://localhost:3001" : undefined),
    output: argument("output") ?? path.join(extensionRoot, "dist", `lumen-extension-${channel}.zip`),
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
