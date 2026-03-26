-- AlterTable
ALTER TABLE "users" ADD COLUMN "recovery_answer_1_hash" TEXT,
ADD COLUMN "recovery_answer_2_hash" TEXT,
ADD COLUMN "recovery_answer_3_hash" TEXT;
