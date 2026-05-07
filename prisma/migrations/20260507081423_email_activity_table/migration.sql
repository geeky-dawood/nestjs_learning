-- CreateEnum
CREATE TYPE "EmailType" AS ENUM ('ORDER_PLACED', 'ORDER_STATUS_UPDATED');

-- CreateTable
CREATE TABLE "email_activity_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "order_id" TEXT,
    "email_type" "EmailType" NOT NULL,
    "attempt_status" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_activity_logs_pkey" PRIMARY KEY ("id")
);
