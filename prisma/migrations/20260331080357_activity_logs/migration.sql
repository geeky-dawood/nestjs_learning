-- CreateEnum
CREATE TYPE "ActivityActionType" AS ENUM ('ORDER_CREATED', 'ORDER_STATUS_UPDATED', 'ORDER_CANCELLED');

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "order_id" TEXT,
    "previous_status" "OrderStatusEnum",
    "current_status" "OrderStatusEnum",
    "action_type" "ActivityActionType" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);
