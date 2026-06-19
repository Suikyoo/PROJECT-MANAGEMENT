import { db } from "../lib/db/index.ts";
import { projectTable, phaseTable, userTable, userRoleTable, taskTable, tagTable, projectLogTable } from "../lib/db/schema.ts";
import bcrypt from "bcryptjs";
import type { Priority } from "../lib/db/enums.ts";

async function seed() {
  console.log("🌱 Seeding database...");

  // Create users (password is "password123" for all)
  const hash = await bcrypt.hash("password123", 10);

  let raw_users = [
    { name: "Francis Roel L. Abarca", passwordHash: hash, email: "francisroelabarca12@gmail.com"}
  ]
  const users = await db.insert(userTable).values(raw_users.map(u => ({...u, approved: "approved"}))).returning();

  //add me for email testing
  //await db.insert(userTable).values([{name: "Jude Anthony G. Sayson", passwordHash: hash, role: "Supervisor", email: "judeanthony02sayson@gmail.com"}])

  const [roel] = users;

  // Seed roles (all roles now managed via userRoleTable)
  await db.insert(userRoleTable).values([
    { userId: roel.id, role: "Supervisor" },
    { userId: roel.id, role: "QA" },
    { userId: roel.id, role: "Developer" },
  ]);

  // Create projects
  const projects = await db.insert(projectTable).values([
    { name: "PROJECT TRACK", description: "Project Manager made for Aboitiz", state: "MVP" },
  ]).returning();
  console.log(projects);


  // Create phases for Phoenix
  const raw_phases = [
  {
    "projectId": 1,
    "name": "Phase 0 \u2014 Pre-Staging"
  },
  {
    "projectId": 1,
    "name": "Phase 1 \u2014 Dev & Staging"
  },
  {
    "projectId": 1,
    "name": "Phase 2 \u2014 Pilot"
  },
  {
    "projectId": 1,
    "name": "Phase 3 \u2014 Go-Live"
  },
  {
    "projectId": 1,
    "name": "Phase 4 \u2014 UAT & Security"
  },
  {
    "projectId": 1,
    "name": "Compliance Requirements"
  },
  {
    "projectId": 1,
    "name": "Risk & Issues Log"
  },
  {
    "projectId": 1,
    "name": "Document Tracker"
  }
]
  await db.insert(phaseTable).values(raw_phases.map(p => {
    return { ...p, state: "UAT" }
  })).returning();

  //const [phase1, phase2] = phases;

  
  const tasks = [
  {
    "phaseId": 1,
    "title": "Project Kick-off meeting with client stakeholders",
    "description": "Conduct project kick-off meeting; produce kick-off minutes and confirm scope",
    "start": "2026-06-09T00:00:00Z",
    "end": "2026-06-13T00:00:00Z",
    "state": "in-progress",
    "priority": "high"
  },
  {
    "phaseId": 1,
    "title": "Provision Server Environment",
    "description": "Provision Ubuntu VM, install PostgreSQL 16, configure Nginx TLS; get server environment live",
    "start": "2026-06-09T00:00:00Z",
    "end": "2026-06-13T00:00:00Z",
    "state": "in-progress",
    "priority": "high"
  },
  {
    "phaseId": 1,
    "title": "Google API Setup",
    "description": "Register OAuth app, obtain Service Account key, integrate Google Workspace",
    "start": "2026-06-09T00:00:00Z",
    "end": "2026-06-13T00:00:00Z",
    "state": "in-progress",
    "priority": "high"
  },
  {
    "phaseId": 1,
    "title": "Staging Deploy",
    "description": "Deploy TRACK codebase to staging and verify accessibility",
    "start": "2026-06-09T00:00:00Z",
    "end": "2026-06-13T00:00:00Z",
    "state": "in-progress",
    "priority": "high"
  },
  {
    "phaseId": 1,
    "title": "Database Schema migrations & seed",
    "description": "Run Prisma schema migrations and seed initial data",
    "start": "2026-06-16T00:00:00Z",
    "end": "2026-06-20T00:00:00Z",
    "state": "in-progress",
    "priority": "high"
  },
  {
    "phaseId": 1,
    "title": "Drive VDR Setup",
    "description": "Create Google Drive VDR folder hierarchy for pilot project",
    "start": "2026-06-16T00:00:00Z",
    "end": "2026-06-20T00:00:00Z",
    "state": "in-progress",
    "priority": "high"
  },
  {
    "phaseId": 1,
    "title": "UI/UX Walkthrough with client",
    "description": "Walkthrough to confirm branding and layouts; approve look & feel",
    "start": "2026-06-16T00:00:00Z",
    "end": "2026-06-20T00:00:00Z",
    "state": "in-progress",
    "priority": "medium"
  },
  {
    "phaseId": 1,
    "title": "Gate 1 Sign-off",
    "description": "Formal sign-off: environment running, Drive connected, staging accessible",
    "start": "2026-06-16T00:00:00Z",
    "end": "2026-06-20T00:00:00Z",
    "state": "in-progress",
    "priority": "high"
  },
  {
    "phaseId": 2,
    "title": "Configure RBAC & seed roles",
    "description": "Configure 7-role RBAC model and seed all 8 role accounts",
    "start": "2026-06-23T00:00:00Z",
    "end": "2026-06-27T00:00:00Z",
    "state": "in-progress",
    "priority": "high"
  },
  {
    "phaseId": 2,
    "title": "ExternalParty customized login portal",
    "description": "Add ExternalParty login portal with NDA disclaimer and 3-step onboarding",
    "start": "2026-06-23T00:00:00Z",
    "end": "2026-06-27T00:00:00Z",
    "state": "in-progress",
    "priority": "high"
  },
  {
    "phaseId": 2,
    "title": "Build WBS master template (3-level)",
    "description": "Create WBS master template with Stage → Deliverable → Activity structure",
    "start": "2026-06-23T00:00:00Z",
    "end": "2026-06-27T00:00:00Z",
    "state": "in-progress",
    "priority": "high"
  },
  {
    "phaseId": 2,
    "title": "Add formula engine to WBS",
    "description": "Implement 60+ Excel-compatible functions, recursive parser and cross-column refs",
    "start": "2026-06-23T00:00:00Z",
    "end": "2026-07-04T00:00:00Z",
    "state": "in-progress",
    "priority": "high"
  },
  {
    "phaseId": 2,
    "title": "WBS Assigned & Validator columns",
    "description": "Add Assigned (N) and Validator (O) columns with avatar chips and read-only validator chip",
    "start": "2026-06-23T00:00:00Z",
    "end": "2026-07-04T00:00:00Z",
    "state": "in-progress",
    "priority": "high"
  },
  {
    "phaseId": 2,
    "title": "Stage Gate Gantt markers in WBS",
    "description": "Add orange vertical Gantt markers and name flag per gate date",
    "start": "2026-06-30T00:00:00Z",
    "end": "2026-07-04T00:00:00Z",
    "state": "in-progress",
    "priority": "medium"
  },
  {
    "phaseId": 2,
    "title": "Amendment unlock UX",
    "description": "Add 'Request Amendment' button, mandatory reason field and RFC modal",
    "start": "2026-06-30T00:00:00Z",
    "end": "2026-07-04T00:00:00Z",
    "state": "in-progress",
    "priority": "high"
  },
  {
    "phaseId": 2,
    "title": "WBS edit gate fix (canEdit)",
    "description": "Replace isDraft with canEdit (wbsStatus !== Approved) so add/row and reorder work",
    "start": "2026-06-23T00:00:00Z",
    "end": "2026-06-27T00:00:00Z",
    "state": "in-progress",
    "priority": "high"
  },
  {
    "phaseId": 2,
    "title": "WBS auto-refresh (async)",
    "description": "Implement async re-fetch after mutation using React Query invalidateQueries",
    "start": "2026-07-07T00:00:00Z",
    "end": "2026-07-11T00:00:00Z",
    "state": "in-progress",
    "priority": "medium"
  },
  {
    "phaseId": 2,
    "title": "WBS governance edit bug fix",
    "description": "Fix canEdit check so PM can edit during governance review",
    "start": "2026-07-07T00:00:00Z",
    "end": "2026-07-11T00:00:00Z",
    "state": "in-progress",
    "priority": "high"
  },
  {
    "phaseId": 2,
    "title": "WBS approval status column",
    "description": "Add color-coded status chips (green/amber/red/gray/blue) in WBS",
    "start": "2026-07-07T00:00:00Z",
    "end": "2026-07-11T00:00:00Z",
    "state": "in-progress",
    "priority": "medium"
  },
  {
    "phaseId": 2,
    "title": "Rename File Manager → Virtual Data Room (VDR)",
    "description": "Update UI labels, routes, sidebar and page title to VDR",
    "start": "2026-07-07T00:00:00Z",
    "end": "2026-07-11T00:00:00Z",
    "state": "in-progress",
    "priority": "high"
  },
  {
    "phaseId": 2,
    "title": "Remove Google Drive frontend references",
    "description": "Remove Drive buttons, driveFileId display and admin settings link from frontend",
    "start": "2026-07-07T00:00:00Z",
    "end": "2026-07-11T00:00:00Z",
    "state": "in-progress",
    "priority": "high"
  },
  {
    "phaseId": 2,
    "title": "Add Validator column in VDR list view",
    "description": "Show validator name from WBS line item with green chip or dash if unassigned",
    "start": "2026-07-07T00:00:00Z",
    "end": "2026-07-11T00:00:00Z",
    "state": "in-progress",
    "priority": "high"
  },
  {
    "phaseId": 2,
    "title": "VDR two-panel Explorer layout",
    "description": "Implement Windows Explorer-style layout: folder tree + list/grid views, collapsible panels",
    "start": "2026-06-23T00:00:00Z",
    "end": "2026-06-27T00:00:00Z",
    "state": "in-progress",
    "priority": "high"
  },
  {
    "phaseId": 2,
    "title": "VDR File Details Panel",
    "description": "Slide-in panel with metadata, storage badge, Preview/Download/Share actions",
    "start": "2026-06-23T00:00:00Z",
    "end": "2026-06-27T00:00:00Z",
    "state": "in-progress",
    "priority": "high"
  },
  {
    "phaseId": 2,
    "title": "VDR Upload modal",
    "description": "Drag-and-drop multi-file upload with per-file progress and folder upload support",
    "start": "2026-06-23T00:00:00Z",
    "end": "2026-06-27T00:00:00Z",
    "state": "in-progress",
    "priority": "high"
  },
  {
    "phaseId": 2,
    "title": "Document chips in WBS Link column",
    "description": "Clickable indigo chips opening full-screen preview modal for documents",
    "start": "2026-06-23T00:00:00Z",
    "end": "2026-06-27T00:00:00Z",
    "state": "in-progress",
    "priority": "high"
  },
  {
    "phaseId": 2,
    "title": "PDF preview CSP fix (preview endpoint)",
    "description": "Add GET /api/documents/:id/preview endpoint with token param for inline PDF rendering",
    "start": "2026-06-23T00:00:00Z",
    "end": "2026-06-27T00:00:00Z",
    "state": "in-progress",
    "priority": "high"
  },
  {
    "phaseId": 2,
    "title": "Add Approve comments field",
    "description": "Validator can add optional comment on approval; saved to ValidationRecord and audit log",
    "start": "2026-07-07T00:00:00Z",
    "end": "2026-07-11T00:00:00Z",
    "state": "in-progress",
    "priority": "high"
  },
  {
    "phaseId": 2,
    "title": "Rejected flow: show reason + reupload",
    "description": "Show rejection reason, provide Reupload button (owner only), preserve version history",
    "start": "2026-07-07T00:00:00Z",
    "end": "2026-07-11T00:00:00Z",
    "state": "in-progress",
    "priority": "high"
  },
  {
    "phaseId": 2,
    "title": "Notifications for accepted/rejected docs",
    "description": "Notify submitter and validator on approval/rejection and reupload events (in-app + email)",
    "start": "2026-07-07T00:00:00Z",
    "end": "2026-07-11T00:00:00Z",
    "state": "in-progress",
    "priority": "medium"
  },
  {
    "phaseId": 2,
    "title": "Configure notification templates",
    "description": "Set email HTML and in-app templates per governance rules; implement daily 8AM scan",
    "start": "2026-06-30T00:00:00Z",
    "end": "2026-07-04T00:00:00Z",
    "state": "in-progress",
    "priority": "high"
  },
  {
    "phaseId": 2,
    "title": "Share modal redesign",
    "description": "Redesign share modal with pill toggle (Share by Link / Share by Email), expiration and view limits",
    "start": "2026-06-23T00:00:00Z",
    "end": "2026-06-27T00:00:00Z",
    "state": "in-progress",
    "priority": "medium"
  },
  {
    "phaseId": 2,
    "title": "PDF watermarking for shared docs",
    "description": "Apply diagonal CONFIDENTIAL watermark and identity header/footer on protected documents",
    "start": "2026-06-23T00:00:00Z",
    "end": "2026-06-27T00:00:00Z",
    "state": "in-progress",
    "priority": "high"
  },
  {
    "phaseId": 2,
    "title": "Password-protected shared links",
    "description": "Add bcrypt-hashed accessPassword on SharedLink and show password gate in SharedView",
    "start": "2026-06-23T00:00:00Z",
    "end": "2026-06-27T00:00:00Z",
    "state": "in-progress",
    "priority": "high"
  },
  {
    "phaseId": 2,
    "title": "IP traceability logging",
    "description": "Log SHA-256 fingerprint of IP+UserAgent on every access/preview/download in audit log",
    "start": "2026-06-23T00:00:00Z",
    "end": "2026-06-27T00:00:00Z",
    "state": "in-progress",
    "priority": "high"
  },
  {
    "phaseId": 2,
    "title": "Verify Google OAuth SSO integration",
    "description": "Validate SSO integration with client domain (ARI)",
    "start": "2026-06-23T00:00:00Z",
    "end": "2026-06-27T00:00:00Z",
    "state": "backlog",
    "priority": "high"
  },
  {
    "phaseId": 2,
    "title": "MFA (TOTP) enrollment flow testing",
    "description": "Test TOTP enrollment flow for all roles",
    "start": "2026-06-30T00:00:00Z",
    "end": "2026-07-04T00:00:00Z",
    "state": "backlog",
    "priority": "high"
  },
  {
    "phaseId": 2,
    "title": "Configure Approval Matrix rules",
    "description": "Set approval workflows per ARI governance (RACI)",
    "start": "2026-06-30T00:00:00Z",
    "end": "2026-07-04T00:00:00Z",
    "state": "backlog",
    "priority": "high"
  },
  {
    "phaseId": 2,
    "title": "Stage Gate and Milestone configuration",
    "description": "Configure stage gates and milestones per project types (Pre-Feasibility → Pre-Construction)",
    "start": "2026-07-07T00:00:00Z",
    "end": "2026-07-11T00:00:00Z",
    "state": "backlog",
    "priority": "high"
  },
  {
    "phaseId": 2,
    "title": "Shared link policies",
    "description": "Define expiration defaults, password requirements and naming conventions",
    "start": "2026-07-07T00:00:00Z",
    "end": "2026-07-11T00:00:00Z",
    "state": "backlog",
    "priority": "medium"
  },
  {
    "phaseId": 2,
    "title": "System settings tuning",
    "description": "Tune file size limits, naming conventions and retention policies; document settings",
    "start": "2026-07-07T00:00:00Z",
    "end": "2026-07-11T00:00:00Z",
    "state": "backlog",
    "priority": "medium"
  },
  {
    "phaseId": 2,
    "title": "Gate 2 Demo",
    "description": "Demo: users log in via SSO, upload docs, WBS populated, notifications fire — Gate 2 sign-off",
    "start": "2026-07-07T00:00:00Z",
    "end": "2026-07-11T00:00:00Z",
    "state": "backlog",
    "priority": "high"
  },
  {
    "phaseId": 2,
    "title": "Workflow Guide PDF (2-page)",
    "description": "Create 2-page PDF covering full file lifecycle with actor legend",
    "start": "2026-06-23T00:00:00Z",
    "end": "2026-06-27T00:00:00Z",
    "state": "in-progress",
    "priority": "low"
  },
  {
    "phaseId": 2,
    "title": "Guided Tour: project setup workflow",
    "description": "Implement 16-step guided tour covering Add Project → approval",
    "start": "2026-06-23T00:00:00Z",
    "end": "2026-06-27T00:00:00Z",
    "state": "in-progress",
    "priority": "low"
  },
  {
    "phaseId": 2,
    "title": "Help Modal — Workflows Tab",
    "description": "Add accordion with Project Setup → File Upload → Approval (15 steps) and actor labels",
    "start": "2026-06-23T00:00:00Z",
    "end": "2026-06-27T00:00:00Z",
    "state": "in-progress",
    "priority": "low"
  },
  {
    "phaseId": 3,
    "title": "Workflow tuning: zone transitions & auto-lock",
    "description": "Client-specific workflow tuning including zone transitions (Zone 1→2→3) and auto-lock rules",
    "start": "2026-07-14T00:00:00Z",
    "end": "2026-07-18T00:00:00Z",
    "state": "backlog",
    "priority": "high"
  },
  {
    "phaseId": 3,
    "title": "CR workflow validation with client SME",
    "description": "Validate Change Request workflow with client SME",
    "start": "2026-07-14T00:00:00Z",
    "end": "2026-07-18T00:00:00Z",
    "state": "backlog",
    "priority": "high"
  },
  {
    "phaseId": 3,
    "title": "Cron job scheduling for maintenance",
    "description": "Schedule all 13 cron jobs (staging cleanup, Drive reconciliation, backups) and verify",
    "start": "2026-07-14T00:00:00Z",
    "end": "2026-07-18T00:00:00Z",
    "state": "backlog",
    "priority": "high"
  },
  {
    "phaseId": 3,
    "title": "ML Service deployment",
    "description": "Deploy FastAPI ML service with 6 scikit-learn models + Bayesian network; endpoint testing",
    "start": "2026-07-21T00:00:00Z",
    "end": "2026-07-25T00:00:00Z",
    "state": "backlog",
    "priority": "high"
  },
  {
    "phaseId": 3,
    "title": "Dashboard KPI tiles & Gantt configuration",
    "description": "Configure dashboard KPI tiles, Gantt module and readiness page",
    "start": "2026-07-21T00:00:00Z",
    "end": "2026-07-25T00:00:00Z",
    "state": "backlog",
    "priority": "high"
  },
  {
    "phaseId": 3,
    "title": "PDF report templates and CSV export",
    "description": "Implement Puppeteer PDF templates and verify CSV export",
    "start": "2026-07-21T00:00:00Z",
    "end": "2026-07-25T00:00:00Z",
    "state": "backlog",
    "priority": "medium"
  },
  {
    "phaseId": 3,
    "title": "Performance optimization",
    "description": "Query tuning, index review and N+1 fixes to establish performance baseline",
    "start": "2026-07-28T00:00:00Z",
    "end": "2026-08-01T00:00:00Z",
    "state": "backlog",
    "priority": "high"
  },
  {
    "phaseId": 3,
    "title": "Security hardening",
    "description": "Apply Helmet headers, rate limits, CORS, and dependency audit per OWASP guidelines",
    "start": "2026-07-28T00:00:00Z",
    "end": "2026-08-01T00:00:00Z",
    "state": "backlog",
    "priority": "high"
  },
  {
    "phaseId": 3,
    "title": "Immutable audit log verification",
    "description": "Verify audit trail immutability and enforce retention policy; confirm IP traceability",
    "start": "2026-07-28T00:00:00Z",
    "end": "2026-08-01T00:00:00Z",
    "state": "backlog",
    "priority": "high"
  },
  {
    "phaseId": 3,
    "title": "Gate 3 Walkthrough",
    "description": "Full system walkthrough demo in staging; Gate 3 sign-off",
    "start": "2026-07-28T00:00:00Z",
    "end": "2026-08-01T00:00:00Z",
    "state": "backlog",
    "priority": "high"
  },
  {
    "phaseId": 4,
    "title": "Integration Testing (E2E, Drive, ML)",
    "description": "Perform API end-to-end testing including Drive operations and ML inference",
    "start": "2026-08-04T00:00:00Z",
    "end": "2026-08-08T00:00:00Z",
    "state": "backlog",
    "priority": "high"
  },
  {
    "phaseId": 4,
    "title": "Security audit (OWASP & dependency scan)",
    "description": "Conduct OWASP Top 10 review and dependency vulnerability scan",
    "start": "2026-08-04T00:00:00Z",
    "end": "2026-08-08T00:00:00Z",
    "state": "backlog",
    "priority": "high"
  },
  {
    "phaseId": 4,
    "title": "Performance testing (concurrency & upload stress)",
    "description": "Run performance tests for concurrent users, upload stress and query load",
    "start": "2026-08-04T00:00:00Z",
    "end": "2026-08-08T00:00:00Z",
    "state": "backlog",
    "priority": "high"
  },
  {
    "phaseId": 4,
    "title": "UAT with ARI client testers",
    "description": "User Acceptance Testing with 3–5 ARI testers to collect UAT results",
    "start": "2026-08-11T00:00:00Z",
    "end": "2026-08-15T00:00:00Z",
    "state": "backlog",
    "priority": "high"
  },
  {
    "phaseId": 4,
    "title": "UAT bug fixes and defect resolution",
    "description": "Fix bugs identified in UAT and prepare release candidate build",
    "start": "2026-08-11T00:00:00Z",
    "end": "2026-08-15T00:00:00Z",
    "state": "backlog",
    "priority": "high"
  },
  {
    "phaseId": 4,
    "title": "UAT sign-off from ARI stakeholders",
    "description": "Obtain formal UAT sign-off document from stakeholders",
    "start": "2026-08-11T00:00:00Z",
    "end": "2026-08-15T00:00:00Z",
    "state": "backlog",
    "priority": "high"
  },
  {
    "phaseId": 4,
    "title": "Gate 4 Sign-off",
    "description": "Gate 4 formal sign-off once UAT passed and security audit cleared",
    "start": "2026-08-11T00:00:00Z",
    "end": "2026-08-15T00:00:00Z",
    "state": "backlog",
    "priority": "high"
  },
  {
    "phaseId": 5,
    "title": "Production VM setup",
    "description": "Setup production VM: Nginx TLS, systemd services, PM2 process manager",
    "start": "2026-08-18T00:00:00Z",
    "end": "2026-08-22T00:00:00Z",
    "state": "backlog",
    "priority": "high"
  },
  {
    "phaseId": 5,
    "title": "Database migration to production",
    "description": "Migrate database to production and seed production data",
    "start": "2026-08-18T00:00:00Z",
    "end": "2026-08-22T00:00:00Z",
    "state": "backlog",
    "priority": "high"
  },
  {
    "phaseId": 5,
    "title": "DNS configuration and SSL installation",
    "description": "Configure DNS and install SSL certificate (Client IT)",
    "start": "2026-08-18T00:00:00Z",
    "end": "2026-08-22T00:00:00Z",
    "state": "backlog",
    "priority": "high"
  },
  {
    "phaseId": 5,
    "title": "Smoke testing on production",
    "description": "Run smoke tests to verify production environment stability",
    "start": "2026-08-18T00:00:00Z",
    "end": "2026-08-22T00:00:00Z",
    "state": "backlog",
    "priority": "high"
  },
  {
    "phaseId": 5,
    "title": "Training Session 1: System Administrators",
    "description": "1.5-hour training for System Administrators",
    "start": "2026-08-25T00:00:00Z",
    "end": "2026-08-29T00:00:00Z",
    "state": "backlog",
    "priority": "high"
  },
  {
    "phaseId": 5,
    "title": "Training Session 2: Project Leads & Team Members",
    "description": "1.5-hour training for Project Leads and team members",
    "start": "2026-08-25T00:00:00Z",
    "end": "2026-08-29T00:00:00Z",
    "state": "backlog",
    "priority": "high"
  },
  {
    "phaseId": 5,
    "title": "Training Session 3: Validators & Top Management",
    "description": "1.5-hour training for Validators and Top Management",
    "start": "2026-08-25T00:00:00Z",
    "end": "2026-08-29T00:00:00Z",
    "state": "backlog",
    "priority": "high"
  },
  {
    "phaseId": 5,
    "title": "Go-live deployment",
    "description": "Deploy to production and have all teams switch to TRACK as single source of truth",
    "start": "2026-08-25T00:00:00Z",
    "end": "2026-08-29T00:00:00Z",
    "state": "backlog",
    "priority": "high"
  },
  {
    "phaseId": 5,
    "title": "Post-go-live monitoring (48-hour stabilization)",
    "description": "Monitor production for 48 hours after go-live and produce stabilization report",
    "start": "2026-08-25T00:00:00Z",
    "end": "2026-08-29T00:00:00Z",
    "state": "backlog",
    "priority": "high"
  },
  {
    "phaseId": 5,
    "title": "Gate 5 Final Sign-off",
    "description": "Final sign-off: system operational, training completed, handover to support",
    "start": "2026-08-25T00:00:00Z",
    "end": "2026-08-29T00:00:00Z",
    "state": "backlog",
    "priority": "high"
  },
  {
    "phaseId": 2,
    "title": "Active Sprint Task: Rename File Manager → VDR",
    "description": "Sprint task: update sidebar label, page title, breadcrumb, all strings and route",
    "start": "2026-06-16T00:00:00Z",
    "end": "2026-06-20T00:00:00Z",
    "state": "in-progress",
    "priority": "high"
  },
  {
    "phaseId": 2,
    "title": "Active Sprint Task: Remove Google Drive frontend references",
    "description": "Sprint task: remove Drive button, driveFileId display and admin settings tab link",
    "start": "2026-06-16T00:00:00Z",
    "end": "2026-06-20T00:00:00Z",
    "state": "in-progress",
    "priority": "high"
  },
  {
    "phaseId": 2,
    "title": "Active Sprint Task: Add Validator column in VDR",
    "description": "Sprint task: add validator column reading lineItem.validatorName; show green chip or dash",
    "start": "2026-06-16T00:00:00Z",
    "end": "2026-06-20T00:00:00Z",
    "state": "in-progress",
    "priority": "high"
  },
  {
    "phaseId": 2,
    "title": "Active Sprint Task: Add Approve comments field",
    "description": "Sprint task: add textarea in approval modal that PATCHes /validation/:id/approve and logs audit",
    "start": "2026-06-16T00:00:00Z",
    "end": "2026-06-20T00:00:00Z",
    "state": "in-progress",
    "priority": "high"
  },
  {
    "phaseId": 2,
    "title": "Active Sprint Task: Rejected flow + reupload",
    "description": "Sprint task: show rejection reason, Reupload button for owner, preserve version history",
    "start": "2026-06-16T00:00:00Z",
    "end": "2026-06-20T00:00:00Z",
    "state": "in-progress",
    "priority": "high"
  },
  {
    "phaseId": 2,
    "title": "Active Sprint Task: Notifications for accepted/rejected docs",
    "description": "Sprint task: implement in-app and email notifications on approve/reject/reupload",
    "start": "2026-06-16T00:00:00Z",
    "end": "2026-06-20T00:00:00Z",
    "state": "in-progress",
    "priority": "medium"
  },
  {
    "phaseId": 2,
    "title": "Active Sprint Task: WBS auto-refresh",
    "description": "Sprint task: implement async table refresh using invalidateQueries to avoid full reload",
    "start": "2026-06-16T00:00:00Z",
    "end": "2026-06-20T00:00:00Z",
    "state": "in-progress",
    "priority": "medium"
  },
  {
    "phaseId": 2,
    "title": "Active Sprint Task: Fix WBS locked under governance review",
    "description": "Sprint task: fix canEdit check allowing PM edit during governance review",
    "start": "2026-06-16T00:00:00Z",
    "end": "2026-06-20T00:00:00Z",
    "state": "in-progress",
    "priority": "high"
  },
  {
    "phaseId": 2,
    "title": "Active Sprint Task: WBS approval status column (color-coded)",
    "description": "Sprint task: add status column with green/amber/red/gray/blue chips; read-only in WBS",
    "start": "2026-06-16T00:00:00Z",
    "end": "2026-06-20T00:00:00Z",
    "state": "in-progress",
    "priority": "medium"
  },
  {
    "phaseId": 3,
    "title": "Risk: Bypass Risk mitigation",
    "description": "Revoke write permissions for general users; only App Service Account moves files (mitigation item)",
    "start": "2026-06-09T00:00:00Z",
    "end": "2026-09-01T00:00:00Z",
    "state": "backlog",
    "priority": "medium"
  },
  {
    "phaseId": 3,
    "title": "Risk: Metadata Fatigue mitigation",
    "description": "Standardize dropdowns, date-pickers and WBS-linked reference data to minimize free-text",
    "start": "2026-06-09T00:00:00Z",
    "end": "2026-09-01T00:00:00Z",
    "state": "backlog",
    "priority": "medium"
  },
  {
    "phaseId": 3,
    "title": "Risk: Vendor Dependency mitigation",
    "description": "Enforce strict SLA and ensure source code + DB architecture ownership on handover",
    "start": "2026-06-09T00:00:00Z",
    "end": "2026-09-01T00:00:00Z",
    "state": "backlog",
    "priority": "medium"
  },
  {
    "phaseId": 3,
    "title": "Risk: Validation Bottlenecks mitigation",
    "description": "Implement dedicated Validator Queue, batch-approval and auto-escalation for pending items",
    "start": "2026-06-16T00:00:00Z",
    "end": "2026-07-11T00:00:00Z",
    "state": "in-progress",
    "priority": "high"
  },
  {
    "phaseId": 3,
    "title": "Risk: Shadow IT & Low Adoption mitigation",
    "description": "Streamline UX and secure top management mandate making TRACK the sole source of truth",
    "start": "2026-06-09T00:00:00Z",
    "end": "2026-09-01T00:00:00Z",
    "state": "backlog",
    "priority": "high"
  },
  {
    "phaseId": 3,
    "title": "Risk: Data Leakage mitigation",
    "description": "Apply external sharing protocols, viewer-only restrictions and NDA gate on external portal",
    "start": "2026-06-23T00:00:00Z",
    "end": "2026-06-27T00:00:00Z",
    "state": "in-progress",
    "priority": "critical"
  },
  {
    "phaseId": 3,
    "title": "Risk: Incorrect Timeline Forecasting mitigation",
    "description": "Implement NTP-anchored schedule auto-recalculate and dependency preview before changes",
    "start": "2026-06-09T00:00:00Z",
    "end": "2026-09-01T00:00:00Z",
    "state": "backlog",
    "priority": "critical"
  },
  {
    "phaseId": 3,
    "title": "Risk: Delayed Google API Credentials mitigation",
    "description": "Pre-request credentials in W1 and use mock server for dev if delayed",
    "start": "2026-06-09T00:00:00Z",
    "end": "2026-06-13T00:00:00Z",
    "state": "in-progress",
    "priority": "medium"
  },
  {
    "phaseId": 4,
    "title": "Risk: UAT Tester Unavailability mitigation",
    "description": "Schedule UAT dates in W1 and allow remote testing to avoid go-live slips",
    "start": "2026-06-09T00:00:00Z",
    "end": "2026-08-15T00:00:00Z",
    "state": "backlog",
    "priority": "high"
  }
  ]
  await db.insert(taskTable).values(tasks.map(t => {
    return {...t, supervisorId: roel.id, developerId: (t.state != "backlog") ? roel.id: undefined, start: new Date(t.start), end: new Date(t.end), priority: t.priority as Priority}
  }));

  const tags = [
  {
    "taskId": 1,
    "name": "Kick-off minutes"
  },
  {
    "taskId": 1,
    "name": "confirmed scope"
  },
  {
    "taskId": 2,
    "name": "Server environment live"
  },
  {
    "taskId": 3,
    "name": "API credentials obtained"
  },
  {
    "taskId": 4,
    "name": "Staging accessible"
  },
  {
    "taskId": 5,
    "name": "Database schema live"
  },
  {
    "taskId": 6,
    "name": "Drive structure created"
  },
  {
    "taskId": 7,
    "name": "Approved look & feel"
  },
  {
    "taskId": 8,
    "name": "Gate 1 sign-off document"
  },
  {
    "taskId": 9,
    "name": "All 8 roles seeded"
  },
  {
    "taskId": 9,
    "name": "formatRole() utility added"
  },
  {
    "taskId": 10,
    "name": "External link portal with NDA gate live"
  },
  {
    "taskId": 10,
    "name": "Platform Mockup implemented"
  },
  {
    "taskId": 11,
    "name": "WBS template with categories and line items"
  },
  {
    "taskId": 12,
    "name": "Formula bar"
  },
  {
    "taskId": 12,
    "name": "autocomplete"
  },
  {
    "taskId": 12,
    "name": "guide modal"
  },
  {
    "taskId": 13,
    "name": "Columns N & O live"
  },
  {
    "taskId": 13,
    "name": "column count updated to 14"
  },
  {
    "taskId": 14,
    "name": "Gantt markers in every row"
  },
  {
    "taskId": 14,
    "name": "sticky header"
  },
  {
    "taskId": 15,
    "name": "Amendment flow"
  },
  {
    "taskId": 15,
    "name": "CR prefix"
  },
  {
    "taskId": 16,
    "name": "Add/row and drag-reorder work in Draft & UnderReview"
  },
  {
    "taskId": 17,
    "name": "WBS table refreshes without page reload"
  },
  {
    "taskId": 18,
    "name": "PM can edit during governance review state"
  },
  {
    "taskId": 19,
    "name": "Status column with chip palette"
  },
  {
    "taskId": 20,
    "name": "VDR page title"
  },
  {
    "taskId": 20,
    "name": "breadcrumb"
  },
  {
    "taskId": 20,
    "name": "strings updated"
  },
  {
    "taskId": 21,
    "name": "Drive UI removed"
  },
  {
    "taskId": 21,
    "name": "backend integration preserved"
  },
  {
    "taskId": 22,
    "name": "Validator column with green chip"
  },
  {
    "taskId": 22,
    "name": "dash if unassigned"
  },
  {
    "taskId": 23,
    "name": "Folder tree"
  },
  {
    "taskId": 23,
    "name": "list/grid view"
  },
  {
    "taskId": 23,
    "name": "selection preserved"
  },
  {
    "taskId": 24,
    "name": "Slide-in panel with full metadata"
  },
  {
    "taskId": 25,
    "name": "Upload to /dataroom/folders/:id/upload"
  },
  {
    "taskId": 26,
    "name": "PDF/image/office preview modal"
  },
  {
    "taskId": 26,
    "name": "blob URL cleanup"
  },
  {
    "taskId": 27,
    "name": "PDF renders inline via iframe"
  },
  {
    "taskId": 27,
    "name": "X-Frame-Options stripped"
  },
  {
    "taskId": 28,
    "name": "Comment saved to ValidationRecord"
  },
  {
    "taskId": 28,
    "name": "shown in audit log"
  },
  {
    "taskId": 29,
    "name": "Status resets to PendingForValidation after reupload"
  },
  {
    "taskId": 30,
    "name": "In-app + email notification on approve/reject/reupload"
  },
  {
    "taskId": 31,
    "name": "Notifications configured"
  },
  {
    "taskId": 31,
    "name": "daily 8AM scan implemented"
  },
  {
    "taskId": 32,
    "name": "Expiration"
  },
  {
    "taskId": 32,
    "name": "view limits"
  },
  {
    "taskId": 32,
    "name": "NDA gate"
  },
  {
    "taskId": 32,
    "name": "PDF watermarking"
  },
  {
    "taskId": 33,
    "name": "Watermark on protected documents"
  },
  {
    "taskId": 34,
    "name": "Password gate shown in SharedView"
  },
  {
    "taskId": 35,
    "name": "Audit log captures access events"
  },
  {
    "taskId": 36,
    "name": "SSO working with ARI domain"
  },
  {
    "taskId": 37,
    "name": "MFA functional for all roles"
  },
  {
    "taskId": 38,
    "name": "Approval workflows set per RACI"
  },
  {
    "taskId": 39,
    "name": "Stage gates defined per WBS lifecycle phases"
  },
  {
    "taskId": 40,
    "name": "Sharing policies configured"
  },
  {
    "taskId": 41,
    "name": "Settings finalized and documented"
  },
  {
    "taskId": 42,
    "name": "Gate 2 demo recording"
  },
  {
    "taskId": 42,
    "name": "Gate 2 sign-off"
  },
  {
    "taskId": 43,
    "name": "docs/TRACK-Workflow-Guide.pdf"
  },
  {
    "taskId": 44,
    "name": "Guided tour implemented in-app"
  },
  {
    "taskId": 45,
    "name": "Accordion with actor labels and system notes"
  },
  {
    "taskId": 46,
    "name": "Governance rules active in system"
  },
  {
    "taskId": 47,
    "name": "CR workflow confirmed by SME"
  },
  {
    "taskId": 48,
    "name": "All 13 cron jobs scheduled and verified"
  },
  {
    "taskId": 49,
    "name": "ML predictions live (risk scores, delay prediction)"
  },
  {
    "taskId": 50,
    "name": "Dashboards functional per platform mockup"
  },
  {
    "taskId": 51,
    "name": "Reports generating correctly"
  },
  {
    "taskId": 52,
    "name": "Performance baseline established"
  },
  {
    "taskId": 53,
    "name": "Security hardened per OWASP guidelines"
  },
  {
    "taskId": 54,
    "name": "Audit trail verified"
  },
  {
    "taskId": 54,
    "name": "IP traceability confirmed"
  },
  {
    "taskId": 55,
    "name": "Gate 3 demo recording"
  },
  {
    "taskId": 55,
    "name": "Gate 3 sign-off"
  },
  {
    "taskId": 56,
    "name": "E2E test report"
  },
  {
    "taskId": 57,
    "name": "Security report"
  },
  {
    "taskId": 58,
    "name": "Performance report"
  },
  {
    "taskId": 59,
    "name": "UAT test results"
  },
  {
    "taskId": 60,
    "name": "Release candidate build"
  },
  {
    "taskId": 61,
    "name": "Signed UAT approval document"
  },
  {
    "taskId": 62,
    "name": "Gate 4 sign-off document"
  },
  {
    "taskId": 63,
    "name": "Prod infrastructure live"
  },
  {
    "taskId": 64,
    "name": "Production database live"
  },
  {
    "taskId": 65,
    "name": "Domain live with SSL"
  },
  {
    "taskId": 66,
    "name": "Production verified"
  },
  {
    "taskId": 67,
    "name": "Admin training completed"
  },
  {
    "taskId": 68,
    "name": "User training completed"
  },
  {
    "taskId": 69,
    "name": "Validator training completed"
  },
  {
    "taskId": 70,
    "name": "System live; all projects must use TRACK"
  },
  {
    "taskId": 71,
    "name": "Go-live report"
  },
  {
    "taskId": 72,
    "name": "Final sign-off"
  },
  {
    "taskId": 72,
    "name": "handover document"
  },
  {
    "taskId": 73,
    "name": "Sidebar label"
  },
  {
    "taskId": 73,
    "name": "page title"
  },
  {
    "taskId": 73,
    "name": "breadcrumb"
  },
  {
    "taskId": 73,
    "name": "App.tsx route"
  },
  {
    "taskId": 74,
    "name": "Remove Drive button"
  },
  {
    "taskId": 74,
    "name": "driveField display"
  },
  {
    "taskId": 74,
    "name": "admin settings tab link"
  },
  {
    "taskId": 75,
    "name": "Validator column from lineItem.validatorName"
  },
  {
    "taskId": 75,
    "name": "green chip or dash"
  },
  {
    "taskId": 76,
    "name": "Textarea in approval modal"
  },
  {
    "taskId": 76,
    "name": "PATCH /validation/:id/approve"
  },
  {
    "taskId": 76,
    "name": "audit log"
  },
  {
    "taskId": 77,
    "name": "Show rejection reason"
  },
  {
    "taskId": 77,
    "name": "Reupload button"
  },
  {
    "taskId": 77,
    "name": "version history kept"
  },
  {
    "taskId": 78,
    "name": "Notify submitter on outcome"
  },
  {
    "taskId": 78,
    "name": "notify validator on reupload"
  },
  {
    "taskId": 79,
    "name": "invalidateQueries on mutation"
  },
  {
    "taskId": 79,
    "name": "optimistic status chip update"
  },
  {
    "taskId": 80,
    "name": "PM can edit during governance review"
  },
  {
    "taskId": 80,
    "name": "role/state matrix documented"
  },
  {
    "taskId": 81,
    "name": "Status column: green/amber/red/gray/blue chips"
  },
  {
    "taskId": 82,
    "name": "Revoke all Write permissions for general users"
  },
  {
    "taskId": 82,
    "name": "only App Service Account moves files"
  },
  {
    "taskId": 83,
    "name": "Standardized dropdowns"
  },
  {
    "taskId": 83,
    "name": "date-pickers"
  },
  {
    "taskId": 83,
    "name": "WBS-linked Reference Data"
  },
  {
    "taskId": 84,
    "name": "Strict SLA"
  },
  {
    "taskId": 84,
    "name": "full source code + DB architecture ownership"
  },
  {
    "taskId": 85,
    "name": "Dedicated Validator Queue"
  },
  {
    "taskId": 85,
    "name": "batch-approval"
  },
  {
    "taskId": 85,
    "name": "auto-escalation"
  },
  {
    "taskId": 86,
    "name": "Streamlined UX"
  },
  {
    "taskId": 86,
    "name": "top management mandate"
  },
  {
    "taskId": 87,
    "name": "External Sharing Protocols"
  },
  {
    "taskId": 87,
    "name": "Viewer-Only Restrictions"
  },
  {
    "taskId": 87,
    "name": "NDA gate on external portal"
  },
  {
    "taskId": 88,
    "name": "NTP-Anchored Schedule auto-recalculates"
  },
  {
    "taskId": 88,
    "name": "Dependency Preview before changes"
  },
  {
    "taskId": 89,
    "name": "Pre-requested in W1"
  },
  {
    "taskId": 89,
    "name": "mock server available for dev"
  },
  {
    "taskId": 90,
    "name": "Schedule UAT dates in W1"
  },
  {
    "taskId": 90,
    "name": "allow remote testing"
  }
  ]
  await db.insert(tagTable).values(tags);
  await db.insert(projectLogTable).values([{projectId: 1, content: '<p><em>Project </em><strong><em>TRACK</em></strong><em> Progress:</em></p><img src="data:image/jpeg;base64,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MMMMMMMMMMMMMMMMMMMMOIIMMMMMMMMMMQgMD/GMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMaI4m0koIzBkxV31WAMMMMMMMMMMMMMMMMMMMMMMMMMBINMFCQ0MMMMMMMMMMMMMMMQObo0Cjkuv39tw2CAMMMMMMMMMMMMMMMMMMMMMMMMQsAAIAL04YMMMMMMMMMMMMMMCKJjAAAIALJCKMBJIMcMMcsMMMMMMcssM8oMMMMMCS4GtKMLX3+sMMMMMMMMMMMMNOodRNrlpVqdtgnZ4eq1XPUbyaCowLFz/SwsMMMMWUWgMMMMMPSgAIMMMMMMMMMMMMMMMNOINMMMMMMNNMMMMMMMMMMMMMMMMMMMMMMMc2DsMMMMMMMNIbKoMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMNWoSAMMMMMMMMMEAEMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMO4AQMMMMMMMMMNQJMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMOzysMMMMMMMMMNL60MMMMMcMMMMMQAMcMMMQAcMMAAMMMMMMMMMMMMMMMMMMMMMMMPjCMMMMMMMMMMNL3oMMMMNIMMMMNC41TJ3L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"><p></p>'}])

  /*
  // Create tasks for Phase 2
  await db.insert(taskTable).values([
    { phaseId: phase2.id, supervisorId: marcus.id, title: "API rate limiting", description: "Enforce depth limiters and token buckets.", state: "in-progress", developerId: alex.id, start: new Date("2026-06-05"), end: new Date("2026-06-12") },
  ]);

  // Create a sample feedback
  await db.insert(phaseFeedbackTable).values([
    { phaseId: phase1.id, userId: diana.id, content: "Architecture looks solid. Please ensure the auth gateway handles token expiry gracefully." },
  ]);
  */

  console.log("✅ Seed complete!");
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
