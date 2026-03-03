/*
  Warnings:

  - The `lock_until` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "users" ALTER COLUMN "dob" SET DATA TYPE TEXT,
DROP COLUMN "lock_until",
ADD COLUMN     "lock_until" TIMESTAMP(3);
