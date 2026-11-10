CREATE TABLE "ExtensionSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "installationId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    "userId" TEXT NOT NULL,
    CONSTRAINT "ExtensionSession_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ExtensionSession_refreshTokenHash_key"
ON "ExtensionSession"("refreshTokenHash");

CREATE UNIQUE INDEX "ExtensionSession_userId_installationId_key"
ON "ExtensionSession"("userId", "installationId");

CREATE INDEX "ExtensionSession_userId_revokedAt_createdAt_idx"
ON "ExtensionSession"("userId", "revokedAt", "createdAt");
