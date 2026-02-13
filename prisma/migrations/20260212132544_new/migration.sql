/*
  Warnings:

  - You are about to drop the column `is_locked` on the `loginAttempts` table. All the data in the column will be lost.
  - You are about to drop the column `lock_until` on the `loginAttempts` table. All the data in the column will be lost.
  - You are about to drop the column `wrong_attempt` on the `loginAttempts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "loginAttempts" DROP COLUMN "is_locked",
DROP COLUMN "lock_until",
DROP COLUMN "wrong_attempt",
ADD COLUMN     "attempt_success" BOOLEAN NOT NULL DEFAULT false;
