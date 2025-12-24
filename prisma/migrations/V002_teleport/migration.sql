-- CreateEnum
CREATE TYPE "TeleportStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "teleports" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "externalAccountId" INTEGER NOT NULL,
    "zynkTeleportId" TEXT,
    "status" "TeleportStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teleports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "teleports_userId_key" ON "teleports"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "teleports_zynkTeleportId_key" ON "teleports"("zynkTeleportId");

-- AddForeignKey
ALTER TABLE "teleports" ADD CONSTRAINT "teleports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teleports" ADD CONSTRAINT "teleports_externalAccountId_fkey" FOREIGN KEY ("externalAccountId") REFERENCES "external_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
