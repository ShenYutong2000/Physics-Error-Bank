/**
 * Wipes all app account data in PostgreSQL (users, mistakes, tags) and local data/uploads.
 * Does not delete OSS objects.
 *
 * Usage: npm run db:clear-all
 */
import "dotenv/config";
import { rm } from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL is not set. Skipping PostgreSQL cleanup.");
  } else {
    await prisma.mistakeTag.deleteMany();
    await prisma.mistake.deleteMany();
    await prisma.tag.deleteMany();
    await prisma.user.deleteMany();
    console.log("PostgreSQL: removed all users, mistakes, and tags.");
  }

  try {
    await rm(path.join(process.cwd(), "data", "users.json"), { force: true });
    console.log("Legacy data/users.json removed if it existed.");
  } catch {
    /* ignore */
  }

  const uploadsDir = path.join(process.cwd(), "data", "uploads");
  try {
    await rm(uploadsDir, { recursive: true, force: true });
    console.log("data/uploads: removed (local images only).");
  } catch {
    /* ignore */
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
