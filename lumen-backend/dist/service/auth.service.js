"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.me = me;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../db/prisma"));
function signToken(userId) {
    const secret = process.env.JWT_SECRET;
    if (!secret)
        throw new Error("JWT_SECRET não configurado");
    return jsonwebtoken_1.default.sign({}, secret, { subject: userId, expiresIn: "7d" });
}
async function register(name, email, password) {
    const existing = await prisma_1.default.user.findUnique({ where: { email } });
    if (existing)
        throw new Error("E-mail já cadastrado");
    const passwordHash = await bcrypt_1.default.hash(password, 10);
    const user = await prisma_1.default.user.create({
        data: {
            name,
            email,
            password: passwordHash,
        },
        select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
        },
    });
    return { user, token: signToken(user.id) };
}
async function login(email, password) {
    const user = await prisma_1.default.user.findUnique({ where: { email } });
    if (!user)
        throw new Error("Credenciais inválidas");
    const ok = await bcrypt_1.default.compare(password, user.password);
    if (!ok)
        throw new Error("Credenciais inválidas");
    const token = signToken(user.id);
    return {
        user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt },
        token,
    };
}
async function me(userId) {
    const user = await prisma_1.default.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, createdAt: true },
    });
    if (!user)
        throw new Error("Usuário não encontrado");
    return user;
}
//# sourceMappingURL=auth.service.js.map