-- CreateTable
CREATE TABLE "loginAttempts" (
    "id" TEXT NOT NULL,
    "wrong_attempts" INTEGER NOT NULL,
    "lock_until" TIMESTAMP(3) NOT NULL,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "loginAttempts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "loginAttempts" ADD CONSTRAINT "loginAttempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
