const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadExtensionScript(filename, exportedName, globals = {}) {
  const context = vm.createContext({ URL, ...globals });
  const source = fs.readFileSync(path.join(__dirname, "..", filename), "utf8");
  vm.runInContext(source, context, { filename });
  return context[exportedName];
}

module.exports = { loadExtensionScript };
