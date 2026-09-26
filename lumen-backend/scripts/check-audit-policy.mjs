import { spawnSync } from "node:child_process";

const allowedPackages = new Set(["prisma", "@prisma/config", "deepmerge-ts"]);
const allowedAdvisories = new Set([
  "https://github.com/advisories/GHSA-ggr8-5vv4-36mx",
]);

const npmCli = process.env.npm_execpath;
if (!npmCli) {
  console.error("npm_execpath is unavailable; run this check through npm run audit:ci.");
  process.exit(1);
}

const audit = spawnSync(process.execPath, [npmCli, "audit", "--json"], {
  encoding: "utf8",
  maxBuffer: 10 * 1024 * 1024,
});

let report;
try {
  report = JSON.parse(audit.stdout);
} catch {
  console.error("npm audit did not return valid JSON.");
  if (audit.stderr) console.error(audit.stderr.trim());
  process.exit(1);
}

const vulnerabilities = report.vulnerabilities ?? {};
const packageNames = Object.keys(vulnerabilities);
const unexpectedPackages = packageNames.filter((name) => !allowedPackages.has(name));
const encounteredAdvisories = new Set();

for (const vulnerability of Object.values(vulnerabilities)) {
  for (const cause of vulnerability.via ?? []) {
    if (typeof cause === "object" && cause !== null && typeof cause.url === "string") {
      encounteredAdvisories.add(cause.url);
    }
  }
}

const unexpectedAdvisories = [...encounteredAdvisories].filter(
  (url) => !allowedAdvisories.has(url),
);

if (unexpectedPackages.length > 0 || unexpectedAdvisories.length > 0) {
  console.error("Backend audit policy failed.");
  if (unexpectedPackages.length > 0) {
    console.error(`Unexpected vulnerable packages: ${unexpectedPackages.join(", ")}`);
  }
  if (unexpectedAdvisories.length > 0) {
    console.error(`Unexpected advisories: ${unexpectedAdvisories.join(", ")}`);
  }
  process.exit(1);
}

if (packageNames.length === 0) {
  console.log("Backend audit policy passed with no known vulnerabilities.");
  process.exit(0);
}

if (![...allowedAdvisories].every((url) => encounteredAdvisories.has(url))) {
  console.error("Known vulnerable packages were reported without the documented advisory chain.");
  process.exit(1);
}

console.log(
  "Backend audit policy passed with only the documented Prisma tooling exception (GHSA-ggr8-5vv4-36mx).",
);
