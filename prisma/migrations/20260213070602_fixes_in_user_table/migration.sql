/*
  Warnings:

  - You are about to drop the column `isDeleted` on the `address` table. All the data in the column will be lost.
  - You are about to drop the column `isVerified` on the `address` table. All the data in the column will be lost.
  - You are about to drop the column `isDeleted` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `isVerified` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "address" DROP COLUMN "isDeleted",
DROP COLUMN "isVerified",
ADD COLUMN     "is_Deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_Verified" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "isDeleted",
DROP COLUMN "isVerified",
ADD COLUMN     "is_Deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_Verified" BOOLEAN NOT NULL DEFAULT false;
