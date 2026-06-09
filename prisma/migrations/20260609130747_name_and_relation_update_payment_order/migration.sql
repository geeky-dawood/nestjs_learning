/*
  Warnings:

  - You are about to drop the `activity_logs` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "activity_logs";

-- CreateTable
CREATE TABLE "order_activity_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "order_id" TEXT,
    "previous_status" "OrderStatusEnum",
    "current_status" "OrderStatusEnum",
    "ordered_product_quantity" INTEGER,
    "order_total_price" INTEGER,
    "action_performed_by" "UserRole" NOT NULL,
    "request_method" "RequestMethod" NOT NULL,
    "action_type" "ActivityActionType" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_activity_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
