-- CreateEnum
CREATE TYPE external_account_status AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE wallet_status AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE session_status AS ENUM ('PENDING', 'VERIFIED', 'EXPIRED', 'USED');

-- CreateEnum
CREATE TYPE account_status AS ENUM ('INITIAL', 'ACTIVE', 'PENDING', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "zynkEntityId" TEXT,
    "zynkFundingAccountId" TEXT,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phoneNumberPrefix" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "accountStatus" account_status NOT NULL DEFAULT 'INITIAL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" SERIAL NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "locality" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "zynkWalletId" TEXT NOT NULL,
    "walletName" TEXT NOT NULL DEFAULT 'Primary Wallet',
    "chain" TEXT NOT NULL DEFAULT 'SOLANA',
    "status" wallet_status NOT NULL DEFAULT 'ACTIVE',
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
    "status" session_status NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_accounts" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "zynkExternalAccountId" TEXT,
    "walletAddress" TEXT NOT NULL,
    "label" TEXT,
    "status" external_account_status NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "external_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "addresses_userId_key" ON "addresses"("userId");

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

-- CreateIndex
CREATE UNIQUE INDEX "external_accounts_zynkExternalAccountId_key" ON "external_accounts"("zynkExternalAccountId");

-- CreateIndex
CREATE INDEX "external_accounts_userId_status_idx" ON "external_accounts"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "external_accounts_userId_walletAddress_key" ON "external_accounts"("userId", "walletAddress");

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_accounts" ADD CONSTRAINT "wallet_accounts_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_sessions" ADD CONSTRAINT "wallet_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_accounts" ADD CONSTRAINT "external_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
