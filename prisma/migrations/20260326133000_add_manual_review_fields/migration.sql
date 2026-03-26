-- AlterTable
ALTER TABLE "mistakes" ADD COLUMN "review_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "mistakes" ADD COLUMN "last_reviewed_at" TIMESTAMP(3);
