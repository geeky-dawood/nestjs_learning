/*
  Warnings:

  - Made the column `user_id` on table `loginAttempts` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "loginAttempts" DROP CONSTRAINT "loginAttempts_user_id_fkey";

-- AlterTable
ALTER TABLE "loginAttempts" ALTER COLUMN "user_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "loginAttempts" ADD CONSTRAINT "loginAttempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
