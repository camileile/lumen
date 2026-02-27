/*
  Warnings:

  - You are about to drop the column `result` on the `Analysis` table. All the data in the column will be lost.
  - You are about to alter the column `score` on the `Analysis` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Int`.
  - You are about to drop the column `name` on the `User` table. All the data in the column will be lost.
  - Added the required column `category` to the `Analysis` table without a default value. This is not possible if the table is not empty.
  - Added the required column `domain` to the `Analysis` table without a default value. This is not possible if the table is not empty.
  - Added the required column `summary` to the `Analysis` table without a default value. This is not possible if the table is not empty.
  - Added the required column `url` to the `Analysis` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Analysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Analysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Analysis" ("createdAt", "id", "score", "text", "userId") SELECT "createdAt", "id", "score", "text", "userId" FROM "Analysis";
DROP TABLE "Analysis";
ALTER TABLE "new_Analysis" RENAME TO "Analysis";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("createdAt", "email", "id", "password") SELECT "createdAt", "email", "id", "password" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
