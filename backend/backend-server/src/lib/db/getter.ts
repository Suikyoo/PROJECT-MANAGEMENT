import { eq, type InferSelectModel } from "drizzle-orm";
import { db } from "./index.ts";
import { phaseTable, userTable, projectTable, taskTable, commentTable, logTable } from "./schema.ts";

export async function getProjects(): Promise<InferSelectModel<typeof projectTable>[]> {
  return await db.select().from(projectTable);
}

export async function getProjectsById(id: number): Promise<InferSelectModel<typeof projectTable>[]> {
  return await db.select().from(projectTable).where(eq(projectTable.id, id));
}

export async function getPhasesByProjectId(id: number): Promise<InferSelectModel<typeof phaseTable>[]> {
  return await db.select().from(phaseTable).where(eq(phaseTable.projectId, id));
}

export async function getPhasesById(id: number): Promise<InferSelectModel<typeof phaseTable>[]> {
  return await db.select().from(phaseTable).where(eq(phaseTable.id, id));
}

export async function getUsers(): Promise<InferSelectModel<typeof userTable>[]> {
  return await db.select().from(userTable);
}

export async function getUserById(id: number): Promise<InferSelectModel<typeof userTable>[]> {
  return await db.select().from(userTable).where(eq(userTable.id, id));
}

export async function getUserByUsername(username: string): Promise<InferSelectModel<typeof userTable> | undefined> {
  const result = await db.select().from(userTable).where(eq(userTable.username, username));
  return result[0];
}

export async function getPendingUsers(): Promise<InferSelectModel<typeof userTable>[]> {
  return await db.select().from(userTable).where(eq(userTable.approved, "pending"));
}

export async function getTasks(): Promise<InferSelectModel<typeof taskTable>[]> {
  return await db.select().from(taskTable);
}

export async function getTaskByPhaseId(id: number): Promise<InferSelectModel<typeof taskTable>[]> {
  return await db.select().from(taskTable).where(eq(taskTable.phaseId, id));
}

export async function getTaskById(id: number): Promise<InferSelectModel<typeof taskTable>[]> {
  return await db.select().from(taskTable).where(eq(taskTable.id, id));
}

export async function getCommentsByPhaseId(phaseId: number): Promise<InferSelectModel<typeof commentTable>[]> {
  return await db.select().from(commentTable).where(eq(commentTable.phaseId, phaseId));
}

export async function getTasksByProjectId(projectId: number): Promise<InferSelectModel<typeof taskTable>[]> {
  return await db.select(taskTable).from(taskTable)
    .innerJoin(phaseTable, eq(taskTable.phaseId, phaseTable.id))
    .where(eq(phaseTable.projectId, projectId));
}

export async function getProjectLog(projectId: number): Promise<InferSelectModel<typeof logTable> | undefined> {
  const result = await db.select().from(logTable).where(eq(logTable.projectId, projectId));
  return result[0];
}
