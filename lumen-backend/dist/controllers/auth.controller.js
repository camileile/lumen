"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerController = registerController;
exports.loginController = loginController;
exports.meController = meController;
const auth_service_1 = require("../service/auth.service");
async function registerController(req, res) {
    const { name, email, password } = req.body;
    const data = await (0, auth_service_1.register)(name, email, password);
    return res.status(201).json(data);
}
async function loginController(req, res) {
    const { email, password } = req.body;
    const data = await (0, auth_service_1.login)(email, password);
    return res.json(data);
}
async function meController(req, res) {
    const userId = req.userId;
    const user = await (0, auth_service_1.me)(userId);
    return res.json({ user });
}
//# sourceMappingURL=auth.controller.js.map