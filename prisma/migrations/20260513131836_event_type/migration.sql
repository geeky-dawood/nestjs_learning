/*
  Warnings:

  - You are about to drop the column `reason` on the `payment_activity_logs` table. All the data in the column will be lost.
  - Added the required column `event_type` to the `payment_activity_logs` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentEventType" AS ENUM ('PAYMENT_INTENT_CREATED', 'PAYMENT_INTENT_SUCCEEDED', 'PAYMENT_INTENT_FAILED', 'PAYMENT_INTENT_CANCELED', 'PAYMENT_INTENT_REFUNDED');

-- AlterTable
ALTER TABLE "payment_activity_logs" DROP COLUMN "reason",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "event_type" "PaymentEventType" NOT NULL;
