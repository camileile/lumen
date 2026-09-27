import { Router } from "express";
import { createExtensionAuthorization, exchangeExtensionAuthorization } from "../controllers/extension.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { extensionAuthorizeRateLimit, extensionExchangeRateLimit } from "../middleware/rateLimit.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { createExtensionAuthorizationSchema, exchangeExtensionAuthorizationSchema } from "../schemas/extension.schemas";

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

export default extensionRoutes;
