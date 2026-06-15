import { pgTable, serial, text, timestamp, integer, bigint, uuid } from "drizzle-orm/pg-core";

export const projectTable = pgTable('projects', {
	id: serial('id').primaryKey(),
  name: text('name').notNull(),
  state: text("state").notNull().default("MVP"),
  description: text("description").notNull().default(""),
});

export const phaseTable = pgTable('phases', {
	id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projectTable.id).notNull(),
  name: text('name').notNull(),
  state: text("state").notNull().default("UAT"),
});

export const userTable = pgTable('users', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text("role").notNull().default("Developer"),
  approved: text("approved").notNull().default("pending"), // "pending" | "approved" | "rejected"
});

export const taskTable = pgTable('tasks', {
	id: serial('id').primaryKey(),
  phaseId: integer("phase_id").references( () => phaseTable.id).notNull(),
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

export const projectFeedbackTable = pgTable('project_feedback', {
  id: serial('id').primaryKey(),
  projectId: integer("project_id").references(() => projectTable.id).notNull(),
  userId: integer("user_id").references(() => userTable.id),
  authorName: text("author_name"),
  content: text("content").notNull(),
  createdAt: timestamp({precision: 6, withTimezone: false}).defaultNow().notNull(),
});

export const phaseFeedbackTable = pgTable('phase_feedback', {
  id: serial('id').primaryKey(),
  phaseId: integer("phase_id").references(() => phaseTable.id).notNull(),
  userId: integer("user_id").references(() => userTable.id),
  authorName: text("author_name"),
  content: text("content").notNull(),
  createdAt: timestamp({precision: 6, withTimezone: false}).defaultNow().notNull(),
});

export const projectLogTable = pgTable('project_logs', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projectTable.id).notNull().unique(),
  content: text('content').notNull().default(''),
});

export const phaseLogTable = pgTable('phase_logs', {
  id: serial('id').primaryKey(),
  phaseId: integer('phase_id').references(() => phaseTable.id).notNull().unique(),
  content: text('content').notNull().default(''),
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
  projectId: integer('project_id').references(() => projectTable.id).notNull(),
});

export const tagTable = pgTable('tags', {
  id: serial('id').primaryKey(),
  taskId: integer('task_id').references(() => taskTable.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
});
