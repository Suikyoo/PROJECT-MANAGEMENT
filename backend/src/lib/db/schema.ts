import { pgTable, serial, text, timestamp, integer, bigint, uuid, boolean } from "drizzle-orm/pg-core";

export const projectTable = pgTable('projects', {
	id: serial('id').primaryKey(),
  name: text('name').notNull(),
  state: text("state").notNull().default("MVP"),
  description: text("description").notNull().default(""),
});

export const phaseTable = pgTable('phases', {
	id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projectTable.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  state: text("state").notNull().default("UAT"),
});

export const userTable = pgTable('users', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  approved: text("approved").notNull().default("pending"), // "pending" | "approved" | "rejected"
});

export const userRoleTable = pgTable('user_roles', {
  id: serial('id').primaryKey(),
  userId: integer("user_id").references(() => userTable.id).notNull(),
  role: text("role").notNull(),
});

export const taskTable = pgTable('tasks', {
	id: serial('id').primaryKey(),
  phaseId: integer("phase_id").references( () => phaseTable.id, { onDelete: 'cascade' }).notNull(),
  //when inserting a task, there needs to be a supervisor or a user attached to it
  supervisorId: integer("supervisor_id").references(() => userTable.id).notNull(),
  developerId: integer("developer_id").references(() => userTable.id),
	title: text('title').notNull(),
	description: text('description').notNull().default(""),
  start: timestamp({precision: 6, withTimezone: false}),
  end: timestamp({precision: 6, withTimezone: false}),
  state: text("state").notNull().default("backlog"),
  priority: text("priority", { enum: ["low", "medium", "high", "critical"] }).notNull().default("medium"),
});

export const projectCommentTable = pgTable('project_comments', {
  id: serial('id').primaryKey(),
  projectId: integer("project_id").references(() => projectTable.id, { onDelete: 'cascade' }).notNull(),
  userId: integer("user_id"),
  authorName: text("author_name"),
  content: text("content").notNull(),
  createdAt: timestamp({precision: 6, withTimezone: false}).defaultNow().notNull(),
});

export const phaseCommentTable = pgTable('phase_comments', {
  id: serial('id').primaryKey(),
  phaseId: integer("phase_id").references(() => phaseTable.id, { onDelete: 'cascade' }).notNull(),
  userId: integer("user_id"),
  authorName: text("author_name"),
  content: text("content").notNull(),
  createdAt: timestamp({precision: 6, withTimezone: false}).defaultNow().notNull(),
});

export const projectLogTable = pgTable('project_logs', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projectTable.id, { onDelete: 'cascade' }).notNull().unique(),
  content: text('content').notNull().default(''),
});

export const phaseLogTable = pgTable('phase_logs', {
  id: serial('id').primaryKey(),
  phaseId: integer('phase_id').references(() => phaseTable.id, { onDelete: 'cascade' }).notNull().unique(),
  content: text('content').notNull().default(''),
});

// --- Issues ---

export const resolutionTable = pgTable('resolutions', {
  id: serial('id').primaryKey(),
  issueId: integer('issue_id').references((): any => issueTable.id, { onDelete: 'cascade' }).notNull(),
  userId: integer("user_id").references(() => userTable.id).notNull(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  proof: text('proof'), // Jam link
  createdAt: timestamp({precision: 6, withTimezone: false}).defaultNow().notNull(),
});

export const issueTable = pgTable('issues', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projectTable.id).notNull(),
  userId: integer("user_id").references(() => userTable.id),
  authorName: text("author_name"),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  proof: text('proof'), // Jam link
  priority: text("priority", { enum: ["low", "medium", "high", "critical"] }).notNull().default("medium"),
  createdAt: timestamp({precision: 6, withTimezone: false}).defaultNow().notNull(),
});

// Issue transaction log (insiders stamp) — actions: open → (testing → closed) | rejected
export const issueTransactionTable = pgTable('issue_transactions', {
  id: serial('id').primaryKey(),
  issueId: integer('issue_id').references(() => issueTable.id, { onDelete: 'cascade' }).notNull(),
  userId: integer("user_id").references(() => userTable.id),                      // insider who stamped
  tokenId: uuid('token_id').references(() => tokenTable.id),                       // client token (if applicable)
  authorName: text("author_name"),                                                  // display name for the stamper
  action: text("action", { enum: ["open", "testing", "closed", "rejected"] }).notNull(),
  message: text("message"),                                                          // optional message/note attached to the action
  createdAt: timestamp({precision: 6, withTimezone: false}).defaultNow().notNull(),
});

// Resolution transaction log (client-tokens stamp) — actions: to-review → resolved | revise
export const resolutionTransactionTable = pgTable('resolution_transactions', {
  id: serial('id').primaryKey(),
  resolutionId: integer('resolution_id').references(() => resolutionTable.id, { onDelete: 'cascade' }).notNull(),
  userId: integer("user_id").references(() => userTable.id),                      // (nullable, not used for token stamps)
  tokenId: uuid('token_id').references(() => tokenTable.id),                       // client token who stamped
  authorName: text("author_name"),                                                  // display name for the stamper
  action: text("action", { enum: ["to-review", "revise", "resolved"] }).notNull(),
  message: text("message"),                                                          // optional message/note attached to the action
  createdAt: timestamp({precision: 6, withTimezone: false}).defaultNow().notNull(),
});

export const issueCommentTable = pgTable('issue_comments', {
  id: serial('id').primaryKey(),
  issueId: integer('issue_id').references(() => issueTable.id, { onDelete: 'cascade' }).notNull(),
  userId: integer("user_id"),
  authorName: text("author_name"),
  content: text("content").notNull(),
  createdAt: timestamp({precision: 6, withTimezone: false}).defaultNow().notNull(),
});

export const tagTypeTable = pgTable('tag_types', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
});

export const issueTagTable = pgTable('issue_tags', {
  id: serial('id').primaryKey(),
  issueId: integer('issue_id').references(() => issueTable.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  tagTypeId: integer('tag_type_id').references(() => tagTypeTable.id).notNull(),
});

export const tokenTable = pgTable('tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  dateIssued: timestamp({precision: 6, withTimezone: false}).defaultNow().notNull(),
  expiry: bigint('expiry', { mode: 'number' }).notNull(),
});

export const accessTable = pgTable('access', {
  id: serial('id').primaryKey(),
  tokenId: uuid('token_id').references(() => tokenTable.id).notNull(),
  projectId: integer('project_id').references(() => projectTable.id, { onDelete: 'cascade' }).notNull(),
});

export const tagTable = pgTable('tags', {
  id: serial('id').primaryKey(),
  taskId: integer('task_id').references(() => taskTable.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
});

export const otpSessionTable = pgTable('otp_sessions', {
  id: serial('id').primaryKey(),
  email: text('email').notNull(),
  otp: text('otp').notNull(),
  expiresAt: timestamp('expires_at', { precision: 6, withTimezone: false }).notNull(),
  used: boolean('used').notNull().default(false),
});

export const forgetSessionTable = pgTable('forget_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  expiresAt: timestamp('expires_at', { precision: 6, withTimezone: false }).notNull(),
  used: boolean('used').notNull().default(false),
});
