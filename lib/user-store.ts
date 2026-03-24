import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { hashPassword, verifyPassword } from "@/lib/password-hash";

export type StoredUser = {
  email: string;
  passwordHash: string;
  createdAt: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

type UsersFile = { users: StoredUser[] };

async function ensureDataDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
}

async function readUsers(): Promise<StoredUser[]> {
  try {
    const raw = await readFile(USERS_FILE, "utf8");
    const data = JSON.parse(raw) as UsersFile;
    return Array.isArray(data.users) ? data.users : [];
  } catch {
    return [];
  }
}

async function writeUsers(users: StoredUser[]): Promise<void> {
  await ensureDataDir();
  await writeFile(USERS_FILE, JSON.stringify({ users }, null, 2), "utf8");
}

export async function findUserByEmail(email: string): Promise<StoredUser | null> {
  const users = await readUsers();
  return users.find((u) => u.email === email) ?? null;
}

export async function createRegisteredUser(
  email: string,
  plainPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const existing = await findUserByEmail(email);
  if (existing) {
    return { ok: false, error: "An account with this email already exists." };
  }
  const passwordHash = hashPassword(plainPassword);
  const users = await readUsers();
  users.push({
    email,
    passwordHash,
    createdAt: new Date().toISOString(),
  });
  await writeUsers(users);
  return { ok: true };
}

export async function verifyRegisteredUser(
  email: string,
  plainPassword: string,
): Promise<boolean> {
  const user = await findUserByEmail(email);
  if (!user) return false;
  return verifyPassword(user.passwordHash, plainPassword);
}
