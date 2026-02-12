/*
  Warnings:

  - You are about to drop the column `wrong_attempts` on the `loginAttempts` table. All the data in the column will be lost.
  - Added the required column `reason` to the `loginAttempts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "loginAttempts" DROP COLUMN "wrong_attempts",
ADD COLUMN     "reason" TEXT NOT NULL;
