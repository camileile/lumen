"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// No seu src/routes/index.ts
const express_1 = require("express");
const analyze_routes_1 = __importDefault(require("./analyze.routes"));
const auth_routes_1 = require("./auth.routes");
const history_routes_1 = __importDefault(require("./history.routes"));
const router = (0, express_1.Router)();
router.use("/analyze", analyze_routes_1.default);
router.use("/auth", auth_routes_1.authRoutes); // Isso cria o caminho /auth/...
router.use("/history", history_routes_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map