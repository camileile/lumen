"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function authMiddleware(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Token ausente" });
    }
    const token = header.slice("Bearer ".length);
    const secret = process.env.JWT_SECRET;
    if (!secret)
        return res.status(500).json({ error: "JWT_SECRET não configurado" });
    try {
        const payload = jsonwebtoken_1.default.verify(token, secret);
        if (!payload.sub)
            return res.status(401).json({ error: "Token inválido" });
        req.userId = payload.sub;
        return next();
    }
    catch {
        return res.status(401).json({ error: "Token inválido/expirado" });
    }
}
//# sourceMappingURL=auth.middleware.js.map