/*
  Warnings:

  - Made the column `wrong_attempts` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "users" ALTER COLUMN "wrong_attempts" SET NOT NULL,
ALTER COLUMN "wrong_attempts" SET DEFAULT 0;
