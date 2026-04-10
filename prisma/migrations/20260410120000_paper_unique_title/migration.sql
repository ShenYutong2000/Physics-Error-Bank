-- Allow multiple papers per year/session; only paper title must be unique.
DROP INDEX IF EXISTS "papers_year_session_key";

-- Old schema allowed the same title on different (year, session). Before enforcing
-- unique titles, disambiguate duplicates by appending part of the row id.
UPDATE "papers" p
SET "title" = LEFT(p."title", 140) || ' ' || LEFT(p."id"::text, 8)
FROM (
  SELECT "id",
    ROW_NUMBER() OVER (PARTITION BY "title" ORDER BY "created_at") AS rn
  FROM "papers"
) d
WHERE p."id" = d."id" AND d.rn > 1;

CREATE UNIQUE INDEX "papers_title_key" ON "papers"("title");

CREATE INDEX "papers_year_session_idx" ON "papers"("year", "session");
