-- Add historical pricing fields to SaleItem
ALTER TABLE "SaleItem" ADD COLUMN "unitPrice" DECIMAL NOT NULL DEFAULT 0;
ALTER TABLE "SaleItem" ADD COLUMN "subtotal" DECIMAL NOT NULL DEFAULT 0;

-- Backfill legacy rows using the current product price so existing records remain visible.
UPDATE "SaleItem"
SET
  "unitPrice" = COALESCE(
    (
      SELECT "price"
      FROM "Product"
      WHERE "Product"."id" = "SaleItem"."productId"
    ),
    0
  ),
  "subtotal" = COALESCE(
    (
      SELECT "price"
      FROM "Product"
      WHERE "Product"."id" = "SaleItem"."productId"
    ),
    0
  ) * "quantity";
