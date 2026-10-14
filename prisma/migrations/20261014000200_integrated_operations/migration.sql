-- CreateEnum
CREATE TYPE "CashMovementKind" AS ENUM ('INCOME', 'EXPENSE');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "maxStock" INTEGER;

-- AlterTable
ALTER TABLE "ProductBatch" ADD COLUMN     "purchaseOrderId" TEXT,
ADD COLUMN     "unitCost" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PurchaseOrderItem" ADD COLUMN     "expirationDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "cashSessionId" TEXT,
ADD COLUMN     "cashierId" INTEGER,
ADD COLUMN     "receiptNumber" INTEGER,
ADD COLUMN     "receiptSeries" TEXT,
ADD COLUMN     "requestHash" TEXT,
ADD COLUMN     "requestId" TEXT;

-- AlterTable
ALTER TABLE "SaleItem" ADD COLUMN     "productName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "unitCost" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ReceiptCounter" (
    "series" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ReceiptCounter_pkey" PRIMARY KEY ("series")
);

-- CreateTable
CREATE TABLE "CashMovement" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "kind" "CashMovementKind" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CashMovement_sessionId_createdAt_idx" ON "CashMovement"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "CashRegisterSession_openedById_status_idx" ON "CashRegisterSession"("openedById", "status");

-- CreateIndex
CREATE INDEX "ProductBatch_productId_receivedAt_idx" ON "ProductBatch"("productId", "receivedAt");

-- CreateIndex
CREATE INDEX "ProductBatch_expirationDate_idx" ON "ProductBatch"("expirationDate");

-- CreateIndex
CREATE INDEX "PurchaseOrder_receivedAt_status_idx" ON "PurchaseOrder"("receivedAt", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_requestId_key" ON "Sale"("requestId");

-- CreateIndex
CREATE INDEX "Sale_createdAt_status_idx" ON "Sale"("createdAt", "status");

-- CreateIndex
CREATE INDEX "Sale_cashSessionId_idx" ON "Sale"("cashSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_receiptSeries_receiptNumber_key" ON "Sale"("receiptSeries", "receiptNumber");

-- AddForeignKey
ALTER TABLE "ProductBatch" ADD CONSTRAINT "ProductBatch_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "CashRegisterSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CashRegisterSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Preserve existing rows. NOT VALID checks protect new writes without rewriting history.
CREATE UNIQUE INDEX "CashRegisterSession_one_open_per_cashier" ON "CashRegisterSession" ("openedById") WHERE "status" = 'OPEN';
ALTER TABLE "Product" ADD CONSTRAINT "Product_stock_nonnegative" CHECK ("stock" >= 0) NOT VALID;
ALTER TABLE "ProductBatch" ADD CONSTRAINT "ProductBatch_quantity_nonnegative" CHECK ("quantity" >= 0) NOT VALID;
UPDATE "SaleItem" s SET "productName"=p."name" FROM "Product" p WHERE s."productId"=p."id" AND s."productName"='';
