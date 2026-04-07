/*
  Warnings:

  - Added the required column `action_performed_by` to the `activity_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `request_method` to the `activity_logs` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RequestMethod" AS ENUM ('POST', 'PUT', 'DELETE', 'GET', 'PATCH');

-- AlterEnum
ALTER TYPE "ActivityActionType" ADD VALUE 'ORDER_DELETED';

-- AlterTable
ALTER TABLE "activity_logs" ADD COLUMN     "action_performed_by" "UserRole" NOT NULL,
ADD COLUMN     "order_total_price" INTEGER,
ADD COLUMN     "ordered_product_quantity" INTEGER,
ADD COLUMN     "request_method" "RequestMethod" NOT NULL;
