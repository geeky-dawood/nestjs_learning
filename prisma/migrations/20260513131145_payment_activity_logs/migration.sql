-- CreateTable
CREATE TABLE "payment_activity_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "order_id" TEXT,
    "payment_id" TEXT NOT NULL,
    "previous_status" "PaymentStatus",
    "current_status" "PaymentStatus",
    "reason" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_activity_logs_current_status_retry_count_createdAt_idx" ON "payment_activity_logs"("current_status", "retry_count", "createdAt");
