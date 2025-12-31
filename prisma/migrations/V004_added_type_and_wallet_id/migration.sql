-- AlterTable
ALTER TABLE "external_accounts" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'withdrawal',
ADD COLUMN     "walletId" TEXT;
