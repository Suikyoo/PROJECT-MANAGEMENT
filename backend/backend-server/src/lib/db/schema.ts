import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const projectTable = pgTable('projects', {
	id: serial('id').primaryKey(),
  name: serial('name'),
  state: text("state").notNull(),
  description: text("description"),
});

export const phaseTable = pgTable('phases', {
	id: serial('id').primaryKey(),
  projectId: serial('project_id').references(() => projectTable.id),
  name: serial('name'),
  state: text("state").notNull(),
});

export const userTable = pgTable('users', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
  role: text("role").notNull().default(""),
});

export const taskTable = pgTable('tasks', {
	id: serial('id').primaryKey(),
  phaseId: serial("phase_id").references( () => phaseTable.id),
  //when inserting a task, there needs to be a supervisor or a user attached to it
  supervisorId: serial("supervisor_id").notNull(),
  developerId: serial("developer_id"),
	title: text('title').notNull(),
	description: text('description').notNull().default(""),
  start: timestamp({precision: 6, withTimezone: false}),
  end: timestamp({precision: 6, withTimezone: false}),
  state: text("state").notNull(),
});
