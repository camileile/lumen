"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
// Importe o controller da sua pasta de controllers
const analyze_controller_1 = require("../controllers/analyze.controller"); // Sem o 's'
const router = (0, express_1.Router)();
router.post("/", analyze_controller_1.analyzeController);
exports.default = router;
//# sourceMappingURL=analyze.routes.js.map