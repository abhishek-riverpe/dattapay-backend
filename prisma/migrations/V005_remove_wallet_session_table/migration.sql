/*
  Warnings:

  - You are about to drop the `wallet_sessions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "wallet_sessions" DROP CONSTRAINT "wallet_sessions_userId_fkey";

-- DropTable
DROP TABLE "wallet_sessions";

-- DropEnum
DROP TYPE "SessionStatus";
