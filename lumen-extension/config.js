(function registerLumenConfig(global) {
  global.LumenConfig = Object.freeze({
    apiBaseUrl: "http://localhost:3000",
    dashboardOrigin: "http://localhost:3001",
    buildChannel: "development",
  });
})(globalThis);
