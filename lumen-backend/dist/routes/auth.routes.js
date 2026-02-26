"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const validate_middleware_1 = require("../middleware/validate.middleware");
const auth_schemas_1 = require("../schemas/auth.schemas");
const auth_middleware_1 = require("../middleware/auth.middleware");
exports.authRoutes = (0, express_1.Router)();
exports.authRoutes.post("/register", (0, validate_middleware_1.validateBody)(auth_schemas_1.registerSchema), auth_controller_1.registerController);
exports.authRoutes.post("/login", (0, validate_middleware_1.validateBody)(auth_schemas_1.loginSchema), auth_controller_1.loginController);
exports.authRoutes.get("/me", auth_middleware_1.authMiddleware, auth_controller_1.meController);
//# sourceMappingURL=auth.routes.js.map