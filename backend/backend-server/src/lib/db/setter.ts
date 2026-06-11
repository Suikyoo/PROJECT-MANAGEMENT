import { eq } from "drizzle-orm";
import { db } from "./index.ts";
import { projectTable, phaseTable, userTable, taskTable, commentTable, logTable } from "./schema.ts";
import type { TaskState, Role, ApprovalStatus } from "./enums.ts";

// --- User setters ---

export async function createUser(name: string, username: string, passwordHash: string) {
  const result = await db.insert(userTable).values({
    name,
    username,
    passwordHash,
    role: "Developer",
    approved: "pending",
  }).returning();
  return result[0];
}

export async function approveUser(userId: number, approved: ApprovalStatus) {
  return await db.update(userTable)
    .set({ approved })
    .where(eq(userTable.id, userId))
    .returning();
}

export async function setUserRole(userId: number, role: Role) {
  return await db.update(userTable)
    .set({ role })
    .where(eq(userTable.id, userId))
    .returning();
}

// --- Project setters ---

export async function createProject(name: string, description: string) {
  const result = await db.insert(projectTable).values({
    name,
    description,
    state: "MVP",
  }).returning();
  return result[0];
}

// --- Phase setters ---

export async function createPhase(projectId: number, name: string) {
  const result = await db.insert(phaseTable).values({
    projectId,
    name,
    state: "UAT",
  }).returning();
  return result[0];
}

export async function setPhaseState(phaseId: number, state: string) {
  return await db.update(phaseTable)
    .set({ state })
    .where(eq(phaseTable.id, phaseId))
    .returning();
}

// --- Task setters ---

export async function createTask(phaseId: number, supervisorId: number, title: string, description: string, start?: Date, end?: Date) {
  const result = await db.insert(taskTable).values({
    phaseId,
    supervisorId,
    title,
    description,
    state: "backlog",
    start,
    end,
  }).returning();
  return result[0];
}

// Developer accepts backlog task -> in-progress
export async function acceptTask(taskId: number, developerId: number) {
  return await db.update(taskTable)
    .set({ state: "in-progress" as TaskState, developerId })
    .where(eq(taskTable.id, taskId))
    .returning();
}

// Developer submits task -> to review
export async function submitTask(taskId: number) {
  return await db.update(taskTable)
    .set({ state: "to review" as TaskState })
    .where(eq(taskTable.id, taskId))
    .returning();
}

// QA approves task -> QA approved
export async function approveTask(taskId: number) {
  return await db.update(taskTable)
    .set({ state: "QA approved" as TaskState })
    .where(eq(taskTable.id, taskId))
    .returning();
}

// --- Comment setters ---

export async function createComment(phaseId: number, userId: number, content: string) {
  const result = await db.insert(commentTable).values({
    phaseId,
    userId,
    content,
  }).returning();
  return result[0];
}

// --- Log setters ---

export async function upsertProjectLog(projectId: number, content: string) {
  const existing = await db.select().from(logTable).where(eq(logTable.projectId, projectId));
  if (existing.length > 0) {
    return await db.update(logTable)
      .set({ content })
      .where(eq(logTable.projectId, projectId))
      .returning();
  }
  const result = await db.insert(logTable).values({ projectId, content }).returning();
  return result[0];
}
