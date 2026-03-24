import type { MistakeEntry } from "@/lib/types";
import type { Prisma } from "@prisma/client";
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
    updatedAt: Date;
    mistakeTags: { tag: { name: string } }[];
  },
): MistakeEntry {
  return {
    id: m.id,
    imageUrl: imagePublicPath(m.imageKey),
    tags: m.mistakeTags.map((mt) => mt.tag.name),
    notes: m.notes,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

function normalizeTagNames(tagNames: string[]): string[] {
  return [...new Set(tagNames.map((t) => t.trim()).filter(Boolean))];
}

async function assignTagsToMistake(
  tx: Prisma.TransactionClient,
  userId: string,
  mistakeId: string,
  names: string[],
) {
  const existing = await tx.tag.findMany({
    where: { userId, name: { in: names } },
    select: { id: true, name: true },
  });
  const existingSet = new Set(existing.map((t) => t.name));
  const missingNames = names.filter((n) => !existingSet.has(n));

  if (missingNames.length > 0) {
    await tx.tag.createMany({
      data: missingNames.map((name) => ({ userId, name })),
      skipDuplicates: true,
    });
  }

  const allTags = await tx.tag.findMany({
    where: { userId, name: { in: names } },
    select: { id: true, name: true },
  });

  await tx.mistakeTag.createMany({
    data: allTags.map((tag) => ({ mistakeId, tagId: tag.id })),
    skipDuplicates: true,
  });
}

async function cleanupOrphanTags(tx: Prisma.TransactionClient, userId: string) {
  await tx.tag.deleteMany({
    where: {
      userId,
      mistakeTags: {
        none: {},
      },
    },
  });
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
  const names = normalizeTagNames(input.tagNames);
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
    await assignTagsToMistake(tx, userId, m.id, names);
    return tx.mistake.findUniqueOrThrow({
      where: { id: m.id },
      include: { mistakeTags: { include: { tag: true } } },
    });
  });

  return rowToEntry(mistake);
}

export async function updateMistakeForUser(
  userId: string,
  mistakeId: string,
  input: { notes: string; tagNames: string[]; expectedUpdatedAt: string },
): Promise<{ kind: "ok"; mistake: MistakeEntry } | { kind: "not_found" } | { kind: "conflict" }> {
  const names = normalizeTagNames(input.tagNames);
  if (names.length === 0) {
    throw new Error("At least one tag is required.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.mistake.findFirst({
      where: { id: mistakeId, userId },
      select: { id: true, updatedAt: true },
    });
    if (!existing) return { kind: "not_found" as const };
    if (existing.updatedAt.toISOString() !== input.expectedUpdatedAt) {
      return { kind: "conflict" as const };
    }

    await tx.mistakeTag.deleteMany({ where: { mistakeId } });
    await tx.mistake.update({
      where: { id: mistakeId },
      data: { notes: input.notes },
    });
    await assignTagsToMistake(tx, userId, mistakeId, names);
    await cleanupOrphanTags(tx, userId);
    const full = await tx.mistake.findUniqueOrThrow({
      where: { id: mistakeId },
      include: { mistakeTags: { include: { tag: true } } },
    });
    return { kind: "ok" as const, mistake: rowToEntry(full) };
  });

  return result;
}

export async function deleteMistakeForUser(
  userId: string,
  mistakeId: string,
): Promise<{ imageKey: string } | null> {
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.mistake.findFirst({
      where: { id: mistakeId, userId },
      select: { id: true, imageKey: true },
    });
    if (!existing) return null;
    await tx.mistake.delete({ where: { id: existing.id } });
    await cleanupOrphanTags(tx, userId);
    return { imageKey: existing.imageKey };
  });
  return result;
}
