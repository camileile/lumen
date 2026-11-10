const assert = require("node:assert/strict");
const { mkdtemp, readFile, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { pathToFileURL } = require("node:url");

async function packager() {
  return import(pathToFileURL(path.resolve(__dirname, "../scripts/package-extension.mjs")).href);
}

test("development packages are deterministic", async (context) => {
  const directory = await mkdtemp(path.join(tmpdir(), "lumen-extension-package-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const { packageExtension } = await packager();
  const common = {
    channel: "development",
    apiUrl: "http://localhost:3000",
    dashboardOrigin: "http://localhost:3001",
  };

  await packageExtension({ ...common, output: path.join(directory, "first.zip") });
  await packageExtension({ ...common, output: path.join(directory, "second.zip") });

  const first = await readFile(path.join(directory, "first.zip"));
  assert.deepEqual(first, await readFile(path.join(directory, "second.zip")));
  assert.equal(first.includes(Buffer.from("manifest.json")), true);
  assert.equal(first.includes(Buffer.from("lumen-extension/manifest.json")), false);
});

test("production packages require explicit HTTPS origins", async () => {
  const { packageExtension } = await packager();

  await assert.rejects(() => packageExtension({
    channel: "production",
    apiUrl: "http://localhost:3000",
    dashboardOrigin: "https://app.example.invalid",
    output: path.join(tmpdir(), "lumen-invalid-production.zip"),
  }), /exact HTTPS origin/);

  await assert.rejects(() => packageExtension({
    channel: "production",
    apiUrl: "https://api.example.invalid",
    dashboardOrigin: undefined,
    output: path.join(tmpdir(), "lumen-missing-origin.zip"),
  }), /Missing --dashboard-origin/);
});
