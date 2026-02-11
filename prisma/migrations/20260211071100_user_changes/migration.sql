-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_Locked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "wrong_attempts" INTEGER;
