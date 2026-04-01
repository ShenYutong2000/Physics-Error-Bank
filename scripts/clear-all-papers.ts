/**
 * Deletes every paper and all related rows (questions, attempts, attempt answers).
 * Student submissions and teacher-created papers are all removed. Users are unchanged.
 *
 * Usage: npm run db:clear-papers
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL is not set. Aborting.");
    process.exit(1);
  }
  const result = await prisma.paper.deleteMany({});
  console.log(`PostgreSQL: removed ${result.count} paper(s) and cascaded questions/attempts.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
