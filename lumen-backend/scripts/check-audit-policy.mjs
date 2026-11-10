import { spawnSync } from "node:child_process";

// Each exception is bound to one exact advisory and to the packages npm reports for that chain.
// Any other vulnerable package or advisory fails the check.
const exceptions = [
  {
    advisory: "https://github.com/advisories/GHSA-ggr8-5vv4-36mx",
    reason: "Prisma 6 CLI/config tooling pins deepmerge-ts 7.x; fixed only in Prisma 7 (major).",
    packages: ["prisma", "@prisma/config", "deepmerge-ts"],
  },
  {
    advisory: "https://github.com/advisories/GHSA-g3hv-75wg-m249",
    reason: "Development-only lint tooling; typescript-eslint 8.x requires minimatch 10.x (fixed in 11.0.1).",
    packages: [
      "minimatch",
      "eslint",
      "@eslint/config-array",
      "@eslint/js",
      "typescript-eslint",
      "@typescript-eslint/eslint-plugin",
      "@typescript-eslint/parser",
      "@typescript-eslint/type-utils",
      "@typescript-eslint/typescript-estree",
      "@typescript-eslint/utils",
    ],
  },
];

const allowedPackages = new Set(exceptions.flatMap((exception) => exception.packages));
const allowedAdvisories = new Set(exceptions.map((exception) => exception.advisory));

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

// A package from an exception list must be explained by an advisory that is actually reported.
const activeExceptions = exceptions.filter((exception) => encounteredAdvisories.has(exception.advisory));
const explainedPackages = new Set(activeExceptions.flatMap((exception) => exception.packages));
const unexplainedPackages = packageNames.filter((name) => !explainedPackages.has(name));
if (unexplainedPackages.length > 0) {
  console.error("Backend audit policy failed.");
  console.error(`Vulnerable packages without their documented advisory: ${unexplainedPackages.join(", ")}`);
  process.exit(1);
}

for (const exception of exceptions) {
  if (!encounteredAdvisories.has(exception.advisory)) {
    console.log(`Exception no longer needed and can be removed: ${exception.advisory}`);
  }
}

if (packageNames.length === 0) {
  console.log("Backend audit policy passed with no known vulnerabilities.");
  process.exit(0);
}

console.log("Backend audit policy passed with only documented exceptions:");
for (const exception of activeExceptions) {
  console.log(`- ${exception.advisory}: ${exception.reason}`);
}
