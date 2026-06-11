import { db } from "../lib/db/index.ts";
import { projectTable, phaseTable, userTable, taskTable, commentTable } from "../lib/db/schema.ts";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("🌱 Seeding database...");

  // Create users (password is "password123" for all)
  const hash = await bcrypt.hash("password123", 10);

  const users = await db.insert(userTable).values([
    { name: "Alex Chen", username: "alex", passwordHash: hash, role: "Developer", approved: "approved" },
    { name: "Priya Sharma", username: "priya", passwordHash: hash, role: "QA", approved: "approved" },
    { name: "Diana Osei", username: "diana", passwordHash: hash, role: "Client", approved: "approved" },
    { name: "Marcus Webb", username: "marcus", passwordHash: hash, role: "Supervisor", approved: "approved" },
  ]).returning();

  const [alex, , diana, marcus] = users;

  // Create projects
  const projects = await db.insert(projectTable).values([
    { name: "Phoenix Platform", description: "Core infrastructure rebuild for scalability", state: "MVP" },
    { name: "Orion Dashboard", description: "Analytics dashboard for enterprise clients", state: "MVP" },
    { name: "Nebula API v3", description: "REST API redesign with GraphQL layer", state: "MVP" },
  ]).returning();

  const [phoenix] = projects;

  // Create phases for Phoenix
  const phases = await db.insert(phaseTable).values([
    { projectId: phoenix.id, name: "Phase 1: Architecture & Auth Gateway", state: "UAT" },
    { projectId: phoenix.id, name: "Phase 2: Analytics Dashboard", state: "UAT" },
  ]).returning();

  const [phase1, phase2] = phases;

  // Create tasks for Phase 1
  await db.insert(taskTable).values([
    { phaseId: phase1.id, supervisorId: marcus.id, title: "Design token migration", description: "Refactor old theme configurations into core design system.", state: "backlog", start: new Date("2026-06-23"), end: new Date("2026-06-28") },
    { phaseId: phase1.id, supervisorId: marcus.id, title: "Implement OAuth 2.0 token refresh", description: "Handle secure token rotation hooks.", state: "in-progress", developerId: alex.id, start: new Date("2026-06-10"), end: new Date("2026-06-14") },
    { phaseId: phase1.id, supervisorId: marcus.id, title: "Dashboard widget performance audit", description: "Profile aggregate canvas charts.", state: "to review", developerId: alex.id, start: new Date("2026-06-11"), end: new Date("2026-06-16") },
    { phaseId: phase1.id, supervisorId: marcus.id, title: "Regression test mobile navigation", description: "Verify toggle and sublink spacing.", state: "QA approved", developerId: alex.id, start: new Date("2026-06-13"), end: new Date("2026-06-17") },
  ]);

  // Create tasks for Phase 2
  await db.insert(taskTable).values([
    { phaseId: phase2.id, supervisorId: marcus.id, title: "API rate limiting", description: "Enforce depth limiters and token buckets.", state: "QA approved", developerId: alex.id, start: new Date("2026-06-05"), end: new Date("2026-06-12") },
  ]);

  // Create a sample comment
  await db.insert(commentTable).values([
    { phaseId: phase1.id, userId: diana.id, content: "Architecture looks solid. Please ensure the auth gateway handles token expiry gracefully." },
  ]);

  console.log("✅ Seed complete!");
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
