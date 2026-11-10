import { Router } from "express";
import {
  createExtensionAuthorization,
  exchangeExtensionAuthorization,
  getExtensionSessions,
  logoutExtensionSession,
  refreshExtensionSessionController,
  revokeExtensionSession,
} from "../controllers/extension.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { extensionAuthorizeRateLimit, extensionExchangeRateLimit } from "../middleware/rateLimit.middleware";
import { validateBody } from "../middleware/validate.middleware";
import {
  createExtensionAuthorizationSchema,
  exchangeExtensionAuthorizationSchema,
  refreshExtensionSessionSchema,
  revokeExtensionSessionSchema,
} from "../schemas/extension.schemas";

const extensionRoutes = Router();

extensionRoutes.post(
  "/authorizations",
  authMiddleware,
  extensionAuthorizeRateLimit,
  validateBody(createExtensionAuthorizationSchema),
  createExtensionAuthorization,
);
extensionRoutes.post(
  "/session/exchange",
  extensionExchangeRateLimit,
  validateBody(exchangeExtensionAuthorizationSchema),
  exchangeExtensionAuthorization,
);
extensionRoutes.post(
  "/session/refresh",
  extensionExchangeRateLimit,
  validateBody(refreshExtensionSessionSchema),
  refreshExtensionSessionController,
);
extensionRoutes.post("/session/logout", authMiddleware, logoutExtensionSession);
extensionRoutes.get("/sessions", authMiddleware, getExtensionSessions);
extensionRoutes.post(
  "/sessions/revoke",
  authMiddleware,
  validateBody(revokeExtensionSessionSchema),
  revokeExtensionSession,
);

export default extensionRoutes;
