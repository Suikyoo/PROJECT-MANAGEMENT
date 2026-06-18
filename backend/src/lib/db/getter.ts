import { eq, type InferSelectModel, inArray, and, isNotNull } from "drizzle-orm";
import { db } from "./index.ts";
import { phaseTable, userTable, userRoleTable, projectTable, taskTable, projectCommentTable, phaseCommentTable, projectLogTable, phaseLogTable, tokenTable, accessTable, tagTable, otpSessionTable, forgetSessionTable, issueTable, issueCommentTable, issueTagTable, tagTypeTable, resolutionTable, issueTransactionTable, resolutionTransactionTable } from "./schema.ts";

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

export async function getUserByEmail(email: string): Promise<InferSelectModel<typeof userTable> | undefined> {
  const result = await db.select().from(userTable).where(eq(userTable.email, email));
  return result[0];
}

export async function getRolesByUserId(userId: number): Promise<string[]> {
  const rows = await db.select({ role: userRoleTable.role }).from(userRoleTable).where(eq(userRoleTable.userId, userId));
  return rows.map(r => r.role);
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

export async function getProjectCommentsByProjectId(projectId: number): Promise<InferSelectModel<typeof projectCommentTable>[]> {
  return await db.select().from(projectCommentTable).where(eq(projectCommentTable.projectId, projectId));
}

export async function getPhaseCommentsByPhaseId(phaseId: number): Promise<InferSelectModel<typeof phaseCommentTable>[]> {
  return await db.select().from(phaseCommentTable).where(eq(phaseCommentTable.phaseId, phaseId));
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
    priority: taskTable.priority,
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

// --- Tags ---

export async function getTagsByTaskId(taskId: number): Promise<InferSelectModel<typeof tagTable>[]> {
  return await db.select().from(tagTable).where(eq(tagTable.taskId, taskId));
}

export async function getTagsByProjectId(projectId: number): Promise<InferSelectModel<typeof tagTable>[]> {
  return await db.select({
    id: tagTable.id,
    taskId: tagTable.taskId,
    name: tagTable.name,
  })
    .from(tagTable)
    .innerJoin(taskTable, eq(tagTable.taskId, taskTable.id))
    .innerJoin(phaseTable, eq(taskTable.phaseId, phaseTable.id))
    .where(eq(phaseTable.projectId, projectId));
}

// Get all distinct users involved in a project (as supervisors or developers of its tasks)
export async function getProjectUsers(projectId: number): Promise<InferSelectModel<typeof userTable>[]> {
  const supervisorIds = await db
    .selectDistinct({ id: taskTable.supervisorId })
    .from(taskTable)
    .innerJoin(phaseTable, eq(taskTable.phaseId, phaseTable.id))
    .where(eq(phaseTable.projectId, projectId));

  const developerIds = await db
    .selectDistinct({ id: taskTable.developerId })
    .from(taskTable)
    .innerJoin(phaseTable, eq(taskTable.phaseId, phaseTable.id))
    .where(and(eq(phaseTable.projectId, projectId), isNotNull(taskTable.developerId)));

  const allIds = [...new Set([...supervisorIds.map(r => r.id), ...developerIds.map(r => r.id!)])];

  if (allIds.length === 0) return [];

  return await db.select().from(userTable).where(inArray(userTable.id, allIds));
}

// --- OTP Sessions ---

export async function getValidOtpSession(email: string, otp: string): Promise<InferSelectModel<typeof otpSessionTable> | undefined> {
  const result = await db
    .select()
    .from(otpSessionTable)
    .where(
      and(
        eq(otpSessionTable.email, email),
        eq(otpSessionTable.otp, otp),
        eq(otpSessionTable.used, false),
      )
    );
  // Filter expired in JS (Drizzle doesn't always handle timestamp comparison cleanly)
  const session = result[0];
  if (session && new Date(session.expiresAt) < new Date()) return undefined;
  return session;
}

// --- Forget Sessions ---

export async function getValidForgetSession(id: string): Promise<InferSelectModel<typeof forgetSessionTable> | undefined> {
  const result = await db
    .select()
    .from(forgetSessionTable)
    .where(
      and(
        eq(forgetSessionTable.id, id),
        eq(forgetSessionTable.used, false),
      )
    );
  const session = result[0];
  if (session && new Date(session.expiresAt) < new Date()) return undefined;
  return session;
}

// --- Issues ---

export async function getIssuesByProjectId(projectId: number): Promise<InferSelectModel<typeof issueTable>[]> {
  return await db.select().from(issueTable).where(eq(issueTable.projectId, projectId));
}

export async function getIssueById(id: number): Promise<InferSelectModel<typeof issueTable> | undefined> {
  const result = await db.select().from(issueTable).where(eq(issueTable.id, id));
  return result[0];
}

export async function getIssueCommentsByIssueId(issueId: number): Promise<InferSelectModel<typeof issueCommentTable>[]> {
  return await db.select().from(issueCommentTable).where(eq(issueCommentTable.issueId, issueId));
}

export async function getIssueTagsByIssueId(issueId: number): Promise<InferSelectModel<typeof issueTagTable>[]> {
  return await db.select().from(issueTagTable).where(eq(issueTagTable.issueId, issueId));
}

export async function getTagTypes(): Promise<InferSelectModel<typeof tagTypeTable>[]> {
  return await db.select().from(tagTypeTable);
}

export async function getResolutionByIssueId(issueId: number): Promise<InferSelectModel<typeof resolutionTable> | undefined> {
  const result = await db.select().from(resolutionTable).where(eq(resolutionTable.issueId, issueId));
  return result[0];
}

export async function getIssueTransactionsByIssueId(issueId: number): Promise<InferSelectModel<typeof issueTransactionTable>[]> {
  return await db.select().from(issueTransactionTable).where(eq(issueTransactionTable.issueId, issueId)).orderBy(issueTransactionTable.createdAt);
}

export async function getResolutionTransactionsByResolutionId(resolutionId: number): Promise<InferSelectModel<typeof resolutionTransactionTable>[]> {
  return await db.select().from(resolutionTransactionTable).where(eq(resolutionTransactionTable.resolutionId, resolutionId)).orderBy(resolutionTransactionTable.createdAt);
}
