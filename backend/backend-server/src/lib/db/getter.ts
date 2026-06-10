import { eq, type InferSelectModel } from "drizzle-orm";
import { db } from "./index.ts";
import { phaseTable, userTable, projectTable, taskTable } from "./schema.ts";

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

export async function getTasks(): Promise<InferSelectModel<typeof taskTable>[]> {
  return await db.select().from(taskTable);
}

export async function getTaskByPhaseId(id: number): Promise<InferSelectModel<typeof taskTable>[]> {
  return await db.select().from(taskTable).where(eq(taskTable.phaseId, id));
}
