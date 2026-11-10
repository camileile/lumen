-- This additional index enforces the application-level lowercase email contract for
-- legacy mixed-case rows without rebuilding the User table. It fails safely if a
-- pre-existing database contains case-insensitive collisions.
CREATE UNIQUE INDEX "User_email_nocase_key" ON "User"("email" COLLATE NOCASE);

-- Supports score/history reads ordered by observation time.
CREATE INDEX "Analysis_userId_createdAt_idx" ON "Analysis"("userId", "createdAt");

-- Supports duplicate URL suppression within a user's recent time window.
CREATE INDEX "Analysis_userId_url_createdAt_idx" ON "Analysis"("userId", "url", "createdAt");
