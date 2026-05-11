"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";

function requireAdmin(role: string | undefined) {
  if (role !== "ADMIN") throw new Error("Unauthorized: Admin access required.");
}

export async function getUsers() {
  const session = await auth();
  requireAdmin((session?.user as any)?.role);
  return getDb().user.findMany({
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      assignedProjectIds: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function createUser(data: {
  name: string;
  username: string;
  password: string;
  role: "ADMIN" | "PM" | "VP";
  assignedProjectIds: string[];
}) {
  const session = await auth();
  requireAdmin((session?.user as any)?.role);

  const username = data.username.trim().toLowerCase();
  if (!username || !data.password || !data.name) throw new Error("Name, username, and password are required.");
  if (data.password.length < 6) throw new Error("Password must be at least 6 characters.");

  const existing = await getDb().user.findUnique({ where: { username } });
  if (existing) throw new Error(`Username "${username}" is already taken.`);

  const passwordHash = await hash(data.password, 12);

  const db = getDb();
  const user = await db.user.create({
    data: {
      name: data.name.trim(),
      username,
      passwordHash,
      role: data.role,
      assignedProjectIds: data.role === "PM" ? data.assignedProjectIds : [],
    },
    select: { id: true, name: true, username: true, role: true, assignedProjectIds: true, createdAt: true },
  });

  // Keep Manager table in sync — projects FK requires a Manager record for PM users
  if (data.role === "PM") {
    await db.manager.upsert({
      where: { id: user.id },
      update: { name: data.name.trim(), email: `${username}@piche.ca` },
      create: { id: user.id, name: data.name.trim(), email: `${username}@piche.ca` }
    });
  }

  revalidatePath("/");
  return user;
}

export async function updateUserProjects(userId: string, projectIds: string[]) {
  const session = await auth();
  requireAdmin((session?.user as any)?.role);
  await getDb().user.update({
    where: { id: userId },
    data: { assignedProjectIds: projectIds },
  });
  revalidatePath("/");
}

export async function deleteUser(userId: string) {
  const session = await auth();
  const currentId = session?.user?.id;
  requireAdmin((session?.user as any)?.role);
  if (userId === currentId) throw new Error("You cannot delete your own account.");
  const db = getDb();
  await db.user.delete({ where: { id: userId } });
  // Clean up Manager record if it exists (PM users have one)
  await db.manager.deleteMany({ where: { id: userId } });
  revalidatePath("/");
}

export async function updateUser(userId: string, data: {
  name: string;
  role: "ADMIN" | "PM" | "VP";
  assignedProjectIds: string[];
}) {
  const session = await auth();
  requireAdmin((session?.user as any)?.role);
  if (!data.name.trim()) throw new Error("Name is required.");

  const db = getDb();
  const user = await db.user.update({
    where: { id: userId },
    data: {
      name: data.name.trim(),
      role: data.role,
      assignedProjectIds: data.role === "PM" ? data.assignedProjectIds : [],
    },
    select: { id: true, name: true, username: true, role: true, assignedProjectIds: true, createdAt: true },
  });

  // Sync Manager table
  if (data.role === "PM") {
    await db.manager.upsert({
      where: { id: userId },
      update: { name: data.name.trim() },
      create: { id: userId, name: data.name.trim(), email: `${user.username}@piche.ca` }
    });
  } else {
    // If role changed away from PM, remove from Manager table
    await db.manager.deleteMany({ where: { id: userId } });
  }

  revalidatePath("/");
  return user;
}

export async function resetUserPassword(userId: string, newPassword: string) {
  const session = await auth();
  requireAdmin((session?.user as any)?.role);
  if (newPassword.length < 6) throw new Error("Password must be at least 6 characters.");
  const passwordHash = await hash(newPassword, 12);
  await getDb().user.update({ where: { id: userId }, data: { passwordHash } });
  revalidatePath("/");
}
