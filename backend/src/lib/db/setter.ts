import { eq, and } from "drizzle-orm";
import { db } from "./index.ts";
import { projectTable, phaseTable, userTable, userRoleTable, taskTable, projectCommentTable, phaseCommentTable, projectLogTable, phaseLogTable, tokenTable, accessTable, tagTable, otpSessionTable, forgetSessionTable, issueTable, issueCommentTable, issueTagTable, tagTypeTable, resolutionTable, issueTransactionTable, resolutionTransactionTable } from "./schema.ts";
import type { TaskState, ApprovalStatus } from "./enums.ts";

// --- User setters ---

export async function createUser(name: string, email: string, passwordHash: string) {
  const result = await db.insert(userTable).values({
    name,
    email,
    passwordHash,
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

export async function addUserRole(userId: number, role: string) {
  const existing = await db.select().from(userRoleTable).where(and(eq(userRoleTable.userId, userId), eq(userRoleTable.role, role)));
  if (existing.length > 0) return existing[0];
  const result = await db.insert(userRoleTable).values({ userId, role }).returning();
  return result[0];
}

export async function removeUserRole(userId: number, role: string) {
  return await db.delete(userRoleTable).where(and(eq(userRoleTable.userId, userId), eq(userRoleTable.role, role)));
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

export async function createTask(phaseId: number, supervisorId: number, title: string, description: string, priority?: "low" | "medium" | "high" | "critical", start?: Date, end?: Date) {
  const result = await db.insert(taskTable).values({
    phaseId,
    supervisorId,
    title,
    description,
    state: "backlog",
    priority: (priority || "medium") as "low" | "medium" | "high" | "critical",
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

export async function createProjectComment(projectId: number, userId: number | null, content: string, authorName?: string) {
  const result = await db.insert(projectCommentTable).values({
    projectId,
    userId,
    authorName,
    content,
  }).returning();
  return result[0];
}

export async function createPhaseComment(phaseId: number, userId: number | null, content: string, authorName?: string) {
  const result = await db.insert(phaseCommentTable).values({
    phaseId,
    userId,
    authorName,
    content,
  }).returning();
  return result[0];
}

// --- Log setters ---

export async function createProjectLog(projectId: number, content: string) {
  const existing = await db.select().from(projectLogTable).where(eq(projectLogTable.projectId, projectId));
  if (existing.length > 0) {
    return await db.update(projectLogTable)
      .set({ content })
      .where(eq(projectLogTable.projectId, projectId))
      .returning();
  }
  const result = await db.insert(projectLogTable).values({ projectId, content }).returning();
  return result[0];
}

export async function createPhaseLog(phaseId: number, content: string) {
  const existing = await db.select().from(phaseLogTable).where(eq(phaseLogTable.phaseId, phaseId));
  if (existing.length > 0) {
    return await db.update(phaseLogTable)
      .set({ content })
      .where(eq(phaseLogTable.phaseId, phaseId))
      .returning();
  }
  const result = await db.insert(phaseLogTable).values({ phaseId, content }).returning();
  return result[0];
}

// --- Token / Access setters ---

export async function createToken(name: string, expiry: number) {
  const result = await db.insert(tokenTable).values({
    name,
    expiry,
  }).returning();
  return result[0];
}

export async function createAccess(tokenId: string, projectId: number) {
  const result = await db.insert(accessTable).values({
    tokenId,
    projectId,
  }).returning();
  return result[0];
}

export async function deleteToken(tokenId: string) {
  await db.delete(accessTable).where(eq(accessTable.tokenId, tokenId));
  return await db.delete(tokenTable).where(eq(tokenTable.id, tokenId)).returning();
}

export async function deleteAccess(tokenId: string, projectId: number) {
  return await db.delete(accessTable)
    .where(and(eq(accessTable.tokenId, tokenId), eq(accessTable.projectId, projectId)))
    .returning();
}

export async function deleteUser(userId: number) {
  return await db.delete(userTable).where(eq(userTable.id, userId)).returning();
}

// --- Tag setters ---

export async function createTag(taskId: number, name: string) {
  const result = await db.insert(tagTable).values({ taskId, name }).returning();
  return result[0];
}

export async function deleteTag(tagId: number) {
  return await db.delete(tagTable).where(eq(tagTable.id, tagId)).returning();
}

// --- OTP Session setters ---

export async function createOtpSession(email: string, otp: string, expiresAt: Date) {
  const result = await db.insert(otpSessionTable).values({
    email,
    otp,
    expiresAt,
  }).returning();
  return result[0];
}

export async function consumeOtpSession(id: number) {
  return await db.update(otpSessionTable)
    .set({ used: true })
    .where(eq(otpSessionTable.id, id))
    .returning();
}

// --- Forget Session setters ---

export async function createForgetSession(email: string, expiresAt: Date) {
  const result = await db.insert(forgetSessionTable).values({
    email,
    expiresAt,
  }).returning();
  return result[0];
}

export async function consumeForgetSession(id: string) {
  return await db.update(forgetSessionTable)
    .set({ used: true })
    .where(eq(forgetSessionTable.id, id))
    .returning();
}

export async function setUserPassword(userId: number, passwordHash: string) {
  return await db.update(userTable)
    .set({ passwordHash })
    .where(eq(userTable.id, userId))
    .returning();
}

// --- Issue setters ---

export async function createIssue(projectId: number, title: string, description: string, userId?: number | null, authorName?: string, proof?: string, priority?: "low" | "medium" | "high" | "critical") {
  const result = await db.insert(issueTable).values({
    projectId,
    userId: userId ?? null,
    authorName: authorName ?? null,
    title,
    description,
    proof,
    priority: priority || "medium",
  }).returning();
  const issue = result[0];
  // Auto-stamp initial "open" action so the issue appears in the messenger timeline
  await db.insert(issueTransactionTable).values({
    issueId: issue.id,
    userId: userId ?? null,
    authorName: authorName ?? null,
    action: "open",
  });
  return issue;
}

export async function createIssueComment(issueId: number, userId: number | null, content: string, authorName?: string) {
  const result = await db.insert(issueCommentTable).values({
    issueId,
    userId,
    authorName,
    content,
  }).returning();
  return result[0];
}

export async function createIssueTag(issueId: number, name: string, tagTypeId: number) {
  const result = await db.insert(issueTagTable).values({ issueId, name, tagTypeId }).returning();
  return result[0];
}

export async function deleteIssueTag(tagId: number) {
  return await db.delete(issueTagTable).where(eq(issueTagTable.id, tagId)).returning();
}

export async function createTagType(name: string) {
  const result = await db.insert(tagTypeTable).values({ name }).returning();
  return result[0];
}

export async function createIssueTransaction(issueId: number, action: "open" | "testing" | "closed" | "rejected", userId?: number | null, tokenId?: string, authorName?: string, message?: string) {
  const result = await db.insert(issueTransactionTable).values({
    issueId,
    action,
    userId: userId ?? null,
    tokenId: tokenId ?? null,
    authorName: authorName ?? null,
    message: message ?? null,
  }).returning();
  return result[0];
}

export async function createResolutionTransaction(resolutionId: number, action: "to-review" | "revise" | "resolved", tokenId?: string, userId?: number | null, authorName?: string, message?: string) {
  const result = await db.insert(resolutionTransactionTable).values({
    resolutionId,
    action,
    tokenId: tokenId ?? null,
    userId: userId ?? null,
    authorName: authorName ?? null,
    message: message ?? null,
  }).returning();

  return result[0];
}

export async function createResolution(issueId: number, userId: number, title: string, description: string, proof?: string) {
  const [resolution] = await db.insert(resolutionTable).values({
    issueId,
    userId,
    title,
    description,
    proof,
  }).returning();
  // Auto-stamp initial "to-review" action so the resolution appears in the messenger timeline
  await db.insert(resolutionTransactionTable).values({
    resolutionId: resolution.id,
    userId,
    action: "to-review",
  });
  return resolution;
}
