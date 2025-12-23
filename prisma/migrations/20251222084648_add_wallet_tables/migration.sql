-- CreateEnum
CREATE TYPE "WalletStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('PENDING', 'VERIFIED', 'EXPIRED', 'USED');

-- CreateTable
CREATE TABLE "wallets" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "zynkWalletId" TEXT NOT NULL,
    "walletName" TEXT NOT NULL DEFAULT 'Primary Wallet',
    "chain" TEXT NOT NULL DEFAULT 'SOLANA',
    "status" "WalletStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_accounts" (
    "id" SERIAL NOT NULL,
    "walletId" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "curve" TEXT NOT NULL DEFAULT 'CURVE_ED25519',
    "pathFormat" TEXT NOT NULL DEFAULT 'PATH_FORMAT_BIP32',
    "path" TEXT NOT NULL,
    "addressFormat" TEXT NOT NULL DEFAULT 'ADDRESS_FORMAT_SOLANA',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_sessions" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "otpId" TEXT NOT NULL,
    "sessionPublicKey" TEXT,
    "sessionPrivateKey" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wallets_userId_key" ON "wallets"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_zynkWalletId_key" ON "wallets"("zynkWalletId");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_accounts_walletId_key" ON "wallet_accounts"("walletId");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_accounts_address_key" ON "wallet_accounts"("address");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_sessions_otpId_key" ON "wallet_sessions"("otpId");

-- CreateIndex
CREATE INDEX "wallet_sessions_userId_status_idx" ON "wallet_sessions"("userId", "status");

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_accounts" ADD CONSTRAINT "wallet_accounts_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_sessions" ADD CONSTRAINT "wallet_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
