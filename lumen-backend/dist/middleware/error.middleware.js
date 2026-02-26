"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorMiddleware = errorMiddleware;
function errorMiddleware(err, _req, res, _next) {
    // erros esperados
    if (err instanceof Error) {
        return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: "Erro interno" });
}
//# sourceMappingURL=error.middleware.js.map