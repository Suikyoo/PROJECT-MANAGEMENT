import { eq, type InferSelectModel } from "drizzle-orm";
import { db } from "./index.ts";
import { phaseTable, userTable, projectTable, taskTable, projectFeedbackTable, phaseFeedbackTable, projectLogTable, phaseLogTable, tokenTable, accessTable } from "./schema.ts";

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

export async function getProjectFeedbacksByProjectId(projectId: number): Promise<InferSelectModel<typeof projectFeedbackTable>[]> {
  return await db.select().from(projectFeedbackTable).where(eq(projectFeedbackTable.projectId, projectId));
}

export async function getPhaseFeedbacksByPhaseId(phaseId: number): Promise<InferSelectModel<typeof phaseFeedbackTable>[]> {
  return await db.select().from(phaseFeedbackTable).where(eq(phaseFeedbackTable.phaseId, phaseId));
}

export async function getTasksByProjectId(projectId: number): Promise<InferSelectModel<typeof taskTable>[]> {
  return await db.select({
    id: taskTable.id,
    phaseId: taskTable.phaseId,
    supervisorId: taskTable.supervisorId,
    developerId: taskTable.developerId,
    title: taskTable.title,
    description: taskTable.description,
    start: taskTable.start,
    end: taskTable.end,
    state: taskTable.state,
  })
  .from(taskTable)
  .innerJoin(phaseTable, eq(taskTable.phaseId, phaseTable.id))
  .where(eq(phaseTable.projectId, projectId));
}

export async function getProjectLog(projectId: number): Promise<InferSelectModel<typeof projectLogTable> | undefined> {
  const result = await db.select().from(projectLogTable).where(eq(projectLogTable.projectId, projectId));
  return result[0];
}

export async function getPhaseLog(phaseId: number): Promise<InferSelectModel<typeof phaseLogTable> | undefined> {
  const result = await db.select().from(phaseLogTable).where(eq(phaseLogTable.phaseId, phaseId));
  return result[0];
}

// --- Token / Access ---

export async function getTokenById(id: string): Promise<InferSelectModel<typeof tokenTable> | undefined> {
  const result = await db.select().from(tokenTable).where(eq(tokenTable.id, id));
  return result[0];
}

export async function getAllTokens(): Promise<InferSelectModel<typeof tokenTable>[]> {
  return await db.select().from(tokenTable);
}

export async function getAllowedProjectsByTokenId(id: string): Promise<InferSelectModel<typeof projectTable>[]> {
  return await db
    .select({
      id: projectTable.id,
      name: projectTable.name,
      state: projectTable.state,
      description: projectTable.description,
    })
    .from(projectTable)
    .innerJoin(accessTable, eq(accessTable.projectId, projectTable.id))
    .innerJoin(tokenTable, eq(tokenTable.id, accessTable.tokenId))
    .where(eq(tokenTable.id, id));
}

export async function getAccessByTokenId(tokenId: string): Promise<InferSelectModel<typeof accessTable>[]> {
  return await db.select().from(accessTable).where(eq(accessTable.tokenId, tokenId));
}
