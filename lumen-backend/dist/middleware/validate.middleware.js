"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBody = validateBody;
function validateBody(schema) {
    return (req, res, next) => {
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: "Validação falhou",
                details: parsed.error.flatten(),
            });
        }
        req.body = parsed.data;
        return next();
    };
}
//# sourceMappingURL=validate.middleware.js.map