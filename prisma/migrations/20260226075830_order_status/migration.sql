-- CreateEnum
CREATE TYPE "OrderStatusEnum" AS ENUM ('PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "order_status" "OrderStatusEnum" NOT NULL DEFAULT 'PENDING';
