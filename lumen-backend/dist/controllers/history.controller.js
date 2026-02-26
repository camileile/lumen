"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHistory = void 0;
const getHistory = async (req, res) => {
    try {
        // Lógica para buscar histórico no banco
        return res.status(200).json({ history: [] });
    }
    catch (error) {
        return res.status(500).json({ error: "Erro ao buscar histórico" });
    }
};
exports.getHistory = getHistory;
//# sourceMappingURL=history.controller.js.map