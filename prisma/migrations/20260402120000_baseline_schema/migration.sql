-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'TEACHER');

-- CreateEnum
CREATE TYPE "PaperSession" AS ENUM ('MAY', 'NOV');

-- CreateEnum
CREATE TYPE "ChoiceOption" AS ENUM ('A', 'B', 'C', 'D', 'BLANK');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "recovery_answer_1_hash" TEXT,
    "recovery_answer_2_hash" TEXT,
    "recovery_answer_3_hash" TEXT,
    "name" VARCHAR(80) NOT NULL DEFAULT '',
    "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_email_allowlist" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teacher_email_allowlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mistakes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "image_key" VARCHAR(1024) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mistakes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(128) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mistake_tags" (
    "mistake_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "mistake_tags_pkey" PRIMARY KEY ("mistake_id","tag_id")
);

-- CreateTable
CREATE TABLE "papers" (
    "id" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "year" INTEGER NOT NULL,
    "session" "PaperSession" NOT NULL,
    "question_count" INTEGER NOT NULL DEFAULT 40,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" UUID NOT NULL,

    CONSTRAINT "papers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paper_questions" (
    "id" UUID NOT NULL,
    "paper_id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "correct_answer" "ChoiceOption" NOT NULL,
    "theme" VARCHAR(200) NOT NULL DEFAULT '',

    CONSTRAINT "paper_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paper_attempts" (
    "id" UUID NOT NULL,
    "paper_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correct_count" INTEGER NOT NULL DEFAULT 0,
    "wrong_count" INTEGER NOT NULL DEFAULT 0,
    "accuracy" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "is_latest" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "paper_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paper_attempt_answers" (
    "id" UUID NOT NULL,
    "attempt_id" UUID NOT NULL,
    "question_number" INTEGER NOT NULL,
    "student_answer" "ChoiceOption" NOT NULL,
    "correct_answer" "ChoiceOption" NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    "theme_snapshot" VARCHAR(200) NOT NULL DEFAULT '',

    CONSTRAINT "paper_attempt_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_email_allowlist_email_key" ON "teacher_email_allowlist"("email");

-- CreateIndex
CREATE INDEX "mistakes_user_id_created_at_idx" ON "mistakes"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "tags_user_id_idx" ON "tags"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tags_user_id_name_key" ON "tags"("user_id", "name");

-- CreateIndex
CREATE INDEX "mistake_tags_tag_id_idx" ON "mistake_tags"("tag_id");

-- CreateIndex
CREATE INDEX "papers_published_at_idx" ON "papers"("published_at");

-- CreateIndex
CREATE INDEX "papers_created_at_idx" ON "papers"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "papers_year_session_key" ON "papers"("year", "session");

-- CreateIndex
CREATE INDEX "paper_questions_paper_id_idx" ON "paper_questions"("paper_id");

-- CreateIndex
CREATE UNIQUE INDEX "paper_questions_paper_id_number_key" ON "paper_questions"("paper_id", "number");

-- CreateIndex
CREATE INDEX "paper_attempts_paper_id_user_id_submitted_at_idx" ON "paper_attempts"("paper_id", "user_id", "submitted_at" DESC);

-- CreateIndex
CREATE INDEX "paper_attempts_paper_id_is_latest_idx" ON "paper_attempts"("paper_id", "is_latest");

-- CreateIndex
CREATE INDEX "paper_attempts_user_id_submitted_at_idx" ON "paper_attempts"("user_id", "submitted_at" DESC);

-- CreateIndex
CREATE INDEX "paper_attempt_answers_attempt_id_idx" ON "paper_attempt_answers"("attempt_id");

-- CreateIndex
CREATE INDEX "paper_attempt_answers_is_correct_idx" ON "paper_attempt_answers"("is_correct");

-- CreateIndex
CREATE UNIQUE INDEX "paper_attempt_answers_attempt_id_question_number_key" ON "paper_attempt_answers"("attempt_id", "question_number");

-- AddForeignKey
ALTER TABLE "mistakes" ADD CONSTRAINT "mistakes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mistake_tags" ADD CONSTRAINT "mistake_tags_mistake_id_fkey" FOREIGN KEY ("mistake_id") REFERENCES "mistakes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mistake_tags" ADD CONSTRAINT "mistake_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "papers" ADD CONSTRAINT "papers_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper_questions" ADD CONSTRAINT "paper_questions_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "papers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper_attempts" ADD CONSTRAINT "paper_attempts_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "papers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper_attempts" ADD CONSTRAINT "paper_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper_attempt_answers" ADD CONSTRAINT "paper_attempt_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "paper_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
