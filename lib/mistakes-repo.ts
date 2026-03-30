import { PRESET_TAG_SET, type MistakeEntry } from "@/lib/types";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type MistakeSort = "latest" | "most_wrong" | "recently_edited" | "recently_reviewed";

type ListMistakesInput = {
  sort: MistakeSort;
  page: number;
  pageSize: number;
  search?: string;
  filterTags?: string[];
  tagMatchMode?: "all" | "any";
  createdFrom?: string;
  createdTo?: string;
  hasNotes?: "any" | "yes" | "no";
  presetTag?: string;
};

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
  const names = [...new Set(tagNames.map((t) => t.trim()).filter(Boolean))];
  const invalid = names.filter((name) => !PRESET_TAG_SET.has(name));
  if (invalid.length > 0) {
    throw new Error("Only preset A-E tags are allowed.");
  }
  return names;
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

function buildListWhere(userId: string, input: ListMistakesInput): Prisma.MistakeWhereInput {
  const where: Prisma.MistakeWhereInput = { userId };
  const search = input.search?.trim();
  const tags = [...new Set((input.filterTags ?? []).map((t) => t.trim()).filter(Boolean))];
  const createdFrom = input.createdFrom?.trim();
  const createdTo = input.createdTo?.trim();
  const presetTag = input.presetTag?.trim();

  const andItems: Prisma.MistakeWhereInput[] = [];
  if (search) {
    andItems.push({
      OR: [
        { notes: { contains: search, mode: "insensitive" } },
        {
          mistakeTags: {
            some: {
              tag: { name: { contains: search, mode: "insensitive" } },
            },
          },
        },
      ],
    });
  }
  if (tags.length > 0) {
    if (input.tagMatchMode === "all") {
      tags.forEach((tagName) => {
        andItems.push({ mistakeTags: { some: { tag: { name: tagName } } } });
      });
    } else {
      andItems.push({
        mistakeTags: { some: { tag: { name: { in: tags } } } },
      });
    }
  }
  if (createdFrom || createdTo) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (createdFrom) {
      const fromDate = new Date(`${createdFrom}T00:00:00.000Z`);
      if (!Number.isNaN(fromDate.getTime())) {
        createdAt.gte = fromDate;
      }
    }
    if (createdTo) {
      const toDate = new Date(`${createdTo}T23:59:59.999Z`);
      if (!Number.isNaN(toDate.getTime())) {
        createdAt.lte = toDate;
      }
    }
    if (Object.keys(createdAt).length > 0) {
      andItems.push({ createdAt });
    }
  }
  if (input.hasNotes === "yes") {
    andItems.push({ notes: { not: "" } });
  } else if (input.hasNotes === "no") {
    andItems.push({ notes: "" });
  }
  if (presetTag) {
    andItems.push({
      mistakeTags: {
        some: {
          tag: { name: presetTag },
        },
      },
    });
  }
  if (andItems.length > 0) {
    where.AND = andItems;
  }
  return where;
}

function buildListOrderBy(sort: MistakeSort): Prisma.MistakeOrderByWithRelationInput[] {
  switch (sort) {
    case "most_wrong":
      return [
        { mistakeTags: { _count: "desc" } },
        { updatedAt: "desc" },
        { createdAt: "desc" },
      ];
    case "recently_edited":
      return [{ updatedAt: "desc" }, { createdAt: "desc" }];
    case "recently_reviewed":
      return [{ updatedAt: "desc" }, { createdAt: "desc" }];
    case "latest":
    default:
      return [{ createdAt: "desc" }];
  }
}

export async function listMistakesPageForUser(
  userId: string,
  input: ListMistakesInput,
): Promise<{ rows: MistakeEntry[]; total: number }> {
  const page = Number.isFinite(input.page) ? Math.max(1, Math.floor(input.page)) : 1;
  const pageSize = Number.isFinite(input.pageSize) ? Math.min(100, Math.max(1, Math.floor(input.pageSize))) : 20;
  const where = buildListWhere(userId, input);
  const [rows, total] = await Promise.all([
    prisma.mistake.findMany({
      where,
      orderBy: buildListOrderBy(input.sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { mistakeTags: { include: { tag: true } } },
    }),
    prisma.mistake.count({ where }),
  ]);
  return { rows: rows.map(rowToEntry), total };
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

export async function replaceMistakeImageForUser(
  userId: string,
  mistakeId: string,
  input: { newImageKey: string; expectedUpdatedAt: string },
): Promise<
  | { kind: "ok"; mistake: MistakeEntry; oldImageKey: string }
  | { kind: "not_found" }
  | { kind: "conflict" }
> {
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.mistake.findFirst({
      where: { id: mistakeId, userId },
      select: { id: true, imageKey: true, updatedAt: true },
    });
    if (!existing) return { kind: "not_found" as const };
    if (existing.updatedAt.toISOString() !== input.expectedUpdatedAt) {
      return { kind: "conflict" as const };
    }
    await tx.mistake.update({
      where: { id: mistakeId },
      data: { imageKey: input.newImageKey },
    });
    const full = await tx.mistake.findUniqueOrThrow({
      where: { id: mistakeId },
      include: { mistakeTags: { include: { tag: true } } },
    });
    return {
      kind: "ok" as const,
      mistake: rowToEntry(full),
      oldImageKey: existing.imageKey,
    };
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

async function ensureTagsByName(
  tx: Prisma.TransactionClient,
  userId: string,
  namesRaw: string[],
): Promise<{ id: string; name: string }[]> {
  const names = normalizeTagNames(namesRaw);
  if (names.length === 0) return [];
  const existing = await tx.tag.findMany({
    where: { userId, name: { in: names } },
    select: { id: true, name: true },
  });
  const existingSet = new Set(existing.map((t) => t.name));
  const missing = names.filter((n) => !existingSet.has(n));
  if (missing.length > 0) {
    await tx.tag.createMany({
      data: missing.map((name) => ({ userId, name })),
      skipDuplicates: true,
    });
  }
  return tx.tag.findMany({
    where: { userId, name: { in: names } },
    select: { id: true, name: true },
  });
}

export async function bulkAddTagsToMistakesForUser(
  userId: string,
  mistakeIds: string[],
  tagNames: string[],
): Promise<{ affected: number }> {
  const ids = [...new Set(mistakeIds.filter(Boolean))];
  if (ids.length === 0) return { affected: 0 };
  const names = normalizeTagNames(tagNames);
  if (names.length === 0) return { affected: 0 };
  const affected = await prisma.$transaction(async (tx) => {
    const owned = await tx.mistake.findMany({
      where: { userId, id: { in: ids } },
      select: { id: true },
    });
    if (owned.length === 0) return 0;
    const tags = await ensureTagsByName(
      tx,
      userId,
      names,
    );
    await tx.mistakeTag.createMany({
      data: owned.flatMap((m) => tags.map((t) => ({ mistakeId: m.id, tagId: t.id }))),
      skipDuplicates: true,
    });
    await tx.mistake.updateMany({
      where: { id: { in: owned.map((m) => m.id) } },
      data: { updatedAt: new Date() },
    });
    return owned.length;
  });
  return { affected };
}

export async function bulkRemoveTagsFromMistakesForUser(
  userId: string,
  mistakeIds: string[],
  tagNames: string[],
): Promise<{ affected: number }> {
  const ids = [...new Set(mistakeIds.filter(Boolean))];
  if (ids.length === 0) return { affected: 0 };
  const names = normalizeTagNames(tagNames);
  if (names.length === 0) return { affected: 0 };
  const affected = await prisma.$transaction(async (tx) => {
    const owned = await tx.mistake.findMany({
      where: { userId, id: { in: ids } },
      select: { id: true },
    });
    if (owned.length === 0) return 0;
    const tags = await tx.tag.findMany({
      where: { userId, name: { in: names } },
      select: { id: true },
    });
    if (tags.length > 0) {
      await tx.mistakeTag.deleteMany({
        where: {
          mistakeId: { in: owned.map((m) => m.id) },
          tagId: { in: tags.map((t) => t.id) },
        },
      });
    }
    await cleanupOrphanTags(tx, userId);
    await tx.mistake.updateMany({
      where: { id: { in: owned.map((m) => m.id) } },
      data: { updatedAt: new Date() },
    });
    return owned.length;
  });
  return { affected };
}

export async function bulkDeleteMistakesForUser(
  userId: string,
  mistakeIds: string[],
): Promise<{ deletedIds: string[]; imageKeys: string[] }> {
  const ids = [...new Set(mistakeIds.filter(Boolean))];
  if (ids.length === 0) return { deletedIds: [], imageKeys: [] };
  return prisma.$transaction(async (tx) => {
    const owned = await tx.mistake.findMany({
      where: { userId, id: { in: ids } },
      select: { id: true, imageKey: true },
    });
    if (owned.length === 0) return { deletedIds: [], imageKeys: [] };
    await tx.mistake.deleteMany({ where: { id: { in: owned.map((m) => m.id) } } });
    await cleanupOrphanTags(tx, userId);
    return {
      deletedIds: owned.map((m) => m.id),
      imageKeys: owned.map((m) => m.imageKey),
    };
  });
}

export async function exportMistakesByIdsForUser(
  userId: string,
  mistakeIds: string[],
): Promise<MistakeEntry[]> {
  const ids = [...new Set(mistakeIds.filter(Boolean))];
  if (ids.length === 0) return [];
  const rows = await prisma.mistake.findMany({
    where: { userId, id: { in: ids } },
    orderBy: { createdAt: "desc" },
    include: { mistakeTags: { include: { tag: true } } },
  });
  return rows.map(rowToEntry);
}
