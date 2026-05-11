-- AlterTable
ALTER TABLE "email_activity_logs" ADD COLUMN     "retry_count" INTEGER NOT NULL DEFAULT 0;
