/*
  Warnings:

  - Changed the type of `reason` on the `loginAttempts` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "SigninResponseEnum" AS ENUM ('PASSWORD_MATCHES', 'INVALID_PASSWORD');

-- AlterTable
ALTER TABLE "loginAttempts" DROP COLUMN "reason",
ADD COLUMN     "reason" "SigninResponseEnum" NOT NULL;
