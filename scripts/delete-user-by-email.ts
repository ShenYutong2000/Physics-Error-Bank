/**
 * 按邮箱彻底删除一个用户及数据库中的关联记录，并尝试删除其错题库图片（本地或 OSS）。
 *
 * - Mistake / Tag / PaperAttempt 等随 User 的 onDelete: Cascade 一并删除
 * - Paper 的创建者为 Restrict：若该用户曾创建试卷，会先把试卷的 createdById 转给其他用户；
 *   若库中仅有此一个账号，则删除其创建的全部试卷（与 db:clear-papers 类同，仅影响这些试卷）
 *
 * Usage: npm run db:delete-user -- <email@domain.org>
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { deleteMistakeImageFile } from "@/lib/mistake-files";

const prisma = new PrismaClient();

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("未设置 DATABASE_URL，无法连接数据库。");
    process.exit(1);
  }

  const emailRaw = process.argv[2] ?? "";
  const email = normalizeEmail(emailRaw);
  if (!email || !email.includes("@")) {
    throw new Error("用法: npm run db:delete-user -- <email>");
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });

  if (!user) {
    console.log(`未找到该邮箱的账号: ${email}`);
    return;
  }

  const mistakes = await prisma.mistake.findMany({
    where: { userId: user.id },
    select: { imageKey: true },
  });

  for (const k of mistakes.map((m) => m.imageKey)) {
    await deleteMistakeImageFile(k);
  }
  if (mistakes.length > 0) {
    console.log(`已尝试删除 ${mistakes.length} 个错题图片文件（本地/OSS 对象可能本就不存在，已忽略错误）。`);
  }

  const papersAsCreator = await prisma.paper.count({ where: { createdById: user.id } });
  if (papersAsCreator > 0) {
    const preferTeacher = await prisma.user.findFirst({
      where: { id: { not: user.id }, role: "TEACHER" },
      orderBy: { createdAt: "asc" },
    });
    const replacement = preferTeacher
      ? preferTeacher
      : await prisma.user.findFirst({
          where: { id: { not: user.id } },
          orderBy: { createdAt: "asc" },
        });

    if (replacement) {
      const u = await prisma.paper.updateMany({
        where: { createdById: user.id },
        data: { createdById: replacement.id },
      });
      console.log(
        `该用户以创建者身份关联了 ${papersAsCreator} 份试卷，已把创建者转给: ${replacement.email}（已更新 ${u.count} 行）。`,
      );
    } else {
      const d = await prisma.paper.deleteMany({ where: { createdById: user.id } });
      console.log(
        `该用户以创建者身份关联了 ${papersAsCreator} 份试卷，且库中无其他用户；已删除这 ${d.count} 份试卷及关联题目/作答记录。`,
      );
    }
  }

  const allowRemoved = await prisma.teacherEmailAllowlist.deleteMany({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (allowRemoved.count > 0) {
    console.log(`已从教师邮箱白名单删除 ${allowRemoved.count} 条与 ${email} 匹配的记录。`);
  }

  await prisma.user.delete({ where: { id: user.id } });
  console.log(`已删除用户: ${user.email}（id: ${user.id}）。`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
