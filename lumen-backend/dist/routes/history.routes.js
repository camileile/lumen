"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
// Importando do caminho correto
const history_controller_1 = require("../controllers/history.controller"); // Sem o 's'
const router = (0, express_1.Router)();
router.get("/", history_controller_1.getHistory);
exports.default = router;
//# sourceMappingURL=history.routes.js.map