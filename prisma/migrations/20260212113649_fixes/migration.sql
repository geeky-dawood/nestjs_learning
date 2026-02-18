-- DropForeignKey
ALTER TABLE "loginAttempts" DROP CONSTRAINT "loginAttempts_user_id_fkey";

-- AlterTable
ALTER TABLE "loginAttempts" ALTER COLUMN "user_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "loginAttempts" ADD CONSTRAINT "loginAttempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
