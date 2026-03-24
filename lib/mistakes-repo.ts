import type { MistakeEntry } from "@/lib/types";
import { prisma } from "@/lib/db";

function imagePublicPath(imageKey: string): string {
  return `/api/mistake-files/${imageKey.split("/").map(encodeURIComponent).join("/")}`;
}

export function rowToEntry(
  m: {
    id: string;
    notes: string;
    imageKey: string;
    createdAt: Date;
    mistakeTags: { tag: { name: string } }[];
  },
): MistakeEntry {
  return {
    id: m.id,
    imageUrl: imagePublicPath(m.imageKey),
    tags: m.mistakeTags.map((mt) => mt.tag.name),
    notes: m.notes,
    createdAt: m.createdAt.toISOString(),
  };
}

export async function listMistakesForUser(userId: string): Promise<MistakeEntry[]> {
  const rows = await prisma.mistake.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { mistakeTags: { include: { tag: true } } },
  });
  return rows.map(rowToEntry);
}

export async function createMistakeForUser(
  userId: string,
  input: { imageKey: string; notes: string; tagNames: string[] },
): Promise<MistakeEntry> {
  const names = [...new Set(input.tagNames.map((t) => t.trim()).filter(Boolean))];
  if (names.length === 0) {
    throw new Error("At least one tag is required.");
  }

  const mistake = await prisma.$transaction(async (tx) => {
    const m = await tx.mistake.create({
      data: {
        userId,
        notes: input.notes,
        imageKey: input.imageKey,
      },
    });
    for (const name of names) {
      const tag = await tx.tag.upsert({
        where: { userId_name: { userId, name } },
        create: { userId, name },
        update: {},
      });
      await tx.mistakeTag.create({
        data: { mistakeId: m.id, tagId: tag.id },
      });
    }
    return tx.mistake.findUniqueOrThrow({
      where: { id: m.id },
      include: { mistakeTags: { include: { tag: true } } },
    });
  });

  return rowToEntry(mistake);
}

export async function deleteMistakeForUser(
  userId: string,
  mistakeId: string,
): Promise<{ imageKey: string } | null> {
  const existing = await prisma.mistake.findFirst({
    where: { id: mistakeId, userId },
    select: { id: true, imageKey: true },
  });
  if (!existing) return null;
  await prisma.mistake.delete({ where: { id: existing.id } });
  return { imageKey: existing.imageKey };
}
