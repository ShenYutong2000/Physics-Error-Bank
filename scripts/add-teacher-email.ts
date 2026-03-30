import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

async function main() {
  const emailRaw = process.argv[2] ?? "";
  const email = normalizeEmail(emailRaw);
  if (!email) {
    throw new Error("Usage: npm run teacher:add -- <email>");
  }
  await prisma.teacherEmailAllowlist.upsert({
    where: { email },
    update: {},
    create: { email },
  });
  await prisma.user.updateMany({
    where: { email: { equals: email, mode: "insensitive" } },
    data: { role: "TEACHER" },
  });
  console.log(`Teacher email added: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

