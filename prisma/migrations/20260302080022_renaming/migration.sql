/*
  Warnings:

  - You are about to drop the column `is_Deleted` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `is_Locked` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `is_Verified` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "is_Deleted",
DROP COLUMN "is_Locked",
DROP COLUMN "is_Verified",
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_locked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_verified" BOOLEAN NOT NULL DEFAULT false;
