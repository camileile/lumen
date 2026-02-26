"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const port = Number(process.env.PORT ?? 3000);
app_1.app.listen(port, () => {
    console.log(`API rodando em http://localhost:${port}`);
});
//# sourceMappingURL=server.js.map