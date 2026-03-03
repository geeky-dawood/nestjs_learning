/*
  Warnings:

  - You are about to drop the `loginAttempts` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "loginAttempts" DROP CONSTRAINT "loginAttempts_user_id_fkey";

-- DropTable
DROP TABLE "loginAttempts";

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" TEXT NOT NULL,
    "reason" "SigninResponseEnum" NOT NULL,
    "attempt_success" BOOLEAN NOT NULL DEFAULT false,
    "user_id" TEXT NOT NULL,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "login_attempts" ADD CONSTRAINT "login_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
