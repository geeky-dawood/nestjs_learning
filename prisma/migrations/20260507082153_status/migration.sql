/*
  Warnings:

  - Changed the type of `attempt_status` on the `email_activity_logs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "EmailAttemptStatus" AS ENUM ('SUCCESS', 'FAILED');

-- AlterTable
ALTER TABLE "email_activity_logs" DROP COLUMN "attempt_status",
ADD COLUMN     "attempt_status" "EmailAttemptStatus" NOT NULL;
