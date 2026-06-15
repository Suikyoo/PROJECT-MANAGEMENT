import { db } from "../lib/db/index.ts";
import { projectTable, phaseTable, userTable, taskTable, phaseFeedbackTable } from "../lib/db/schema.ts";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("🌱 Seeding database...");

  // Create users (password is "password123" for all)
  const hash = await bcrypt.hash("password123", 10);

  const users = await db.insert(userTable).values([
    { name: "Alex Chen", username: "alex", passwordHash: hash, role: "Developer", approved: "approved" },
    { name: "Priya Sharma", username: "priya", passwordHash: hash, role: "QA", approved: "approved" },
    { name: "Diana Osei", username: "diana", passwordHash: hash, role: "Developer", approved: "approved" },
    { name: "Marcus Webb", username: "marcus", passwordHash: hash, role: "Supervisor", approved: "approved" },
  ]).returning();

  const [alex, , diana, marcus] = users;

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

  // Create tasks for Phase 1
  const tasks = [
  {
    "phaseId": 0,
    "title": "Provision Ubuntu 24.04 LTS VM",
    "description": "Provision server VM with minimum 8 vCPU, 16 GB RAM, 100 GB SSD for OS+App, 250 GB SSD for DB",
    "start": "2026-06-09T00:00:00Z",
    "end": "2026-06-29T00:00:00Z"
  },
  {
    "phaseId": 0,
    "title": "Configure Firewall Rules",
    "description": "Allow ports 443, 80 (public) and 22 (admin IP only). Deny all other inbound traffic.",
    "start": "2026-06-09T00:00:00Z",
    "end": "2026-06-29T00:00:00Z"
  },
  {
    "phaseId": 0,
    "title": "Set DNS A Record",
    "description": "Point domain A record to the production server's public IP address",
    "start": "2026-06-09T00:00:00Z",
    "end": "2026-06-29T00:00:00Z"
  },
  {
    "phaseId": 0,
    "title": "Provision SSL Certificate",
    "description": "Obtain and install SSL certificate (Let's Encrypt or custom CA) for HTTPS on Nginx",
    "start": "2026-06-09T00:00:00Z",
    "end": "2026-06-29T00:00:00Z"
  },
  {
    "phaseId": 0,
    "title": "Install Node.js 20 LTS",
    "description": "Install Node.js 20 LTS on the VM using NodeSource distribution",
    "start": "2026-06-09T00:00:00Z",
    "end": "2026-06-29T00:00:00Z"
  },
  {
    "phaseId": 0,
    "title": "Install PM2 Process Manager",
    "description": "Install PM2 globally for Node.js process management, auto-restart on reboot",
    "start": "2026-06-09T00:00:00Z",
    "end": "2026-06-29T00:00:00Z"
  },
  {
    "phaseId": 0,
    "title": "Install Python 3.11 with venv",
    "description": "Install Python 3.11 and python3.11-venv for ML service deployment",
    "start": "2026-06-09T00:00:00Z",
    "end": "2026-06-29T00:00:00Z"
  },
  {
    "phaseId": 0,
    "title": "Install PostgreSQL 16",
    "description": "Install PostgreSQL 16 database server",
    "start": "2026-06-09T00:00:00Z",
    "end": "2026-06-29T00:00:00Z"
  },
  {
    "phaseId": 0,
    "title": "Enable PostgreSQL Extensions",
    "description": "Enable pgcrypto (UUID generation) and pg_trgm (full-text search) extensions in PostgreSQL",
    "start": "2026-06-09T00:00:00Z",
    "end": "2026-06-29T00:00:00Z"
  },
  {
    "phaseId": 0,
    "title": "Install Nginx Reverse Proxy",
    "description": "Install Nginx for SSL termination, static file serving, and API proxying",
    "start": "2026-06-09T00:00:00Z",
    "end": "2026-06-29T00:00:00Z"
  },
  {
    "phaseId": 0,
    "title": "Create Google Cloud Project for TRACK Production",
    "description": "Create a dedicated GCP project for TRACK production environment to host OAuth and API credentials",
    "start": "2026-06-09T00:00:00Z",
    "end": "2026-06-29T00:00:00Z"
  },
  {
    "phaseId": 0,
    "title": "Configure OAuth2 Client ID and Secret",
    "description": "Create OAuth2 credentials with production redirect URIs (e.g., https://track.domain.com/auth/callback)",
    "start": "2026-06-09T00:00:00Z",
    "end": "2026-06-29T00:00:00Z"
  },
  {
    "phaseId": 0,
    "title": "Create Service Account with Domain-Wide Delegation",
    "description": "Create a GCP service account and grant domain-wide delegation for Drive, Gmail, Sheets, Admin SDK access",
    "start": "2026-06-09T00:00:00Z",
    "end": "2026-06-29T00:00:00Z"
  },
  {
    "phaseId": 0,
    "title": "Enable Google Drive API",
    "description": "Enable Google Drive API v3 in GCP project for VDR file storage",
    "start": "2026-06-09T00:00:00Z",
    "end": "2026-06-29T00:00:00Z"
  },
  {
    "phaseId": 0,
    "title": "Enable Gmail API",
    "description": "Enable Gmail API v1 for automated email notifications and reminders",
    "start": "2026-06-09T00:00:00Z",
    "end": "2026-06-29T00:00:00Z"
  },
  {
    "phaseId": 0,
    "title": "Enable Google Sheets API",
    "description": "Enable Google Sheets API v4 for WBS template import from Sheets",
    "start": "2026-06-09T00:00:00Z",
    "end": "2026-06-29T00:00:00Z"
  },
  {
    "phaseId": 0,
    "title": "Enable Google Admin SDK",
    "description": "Enable Google Admin SDK for user provisioning and MFA status verification",
    "start": "2026-06-09T00:00:00Z",
    "end": "2026-06-29T00:00:00Z"
  },
  {
    "phaseId": 0,
    "title": "Grant Service Account Scopes in Workspace Admin",
    "description": "Grant the service account the required API scopes in Google Workspace Admin Console",
    "start": "2026-06-09T00:00:00Z",
    "end": "2026-06-29T00:00:00Z"
  },
  {
    "phaseId": 0,
    "title": "Enforce MFA for All Organization Members",
    "description": "Configure Google Workspace Admin Console to enforce TOTP MFA for ALL organization members",
    "start": "2026-06-09T00:00:00Z",
    "end": "2026-06-29T00:00:00Z"
  },
  {
    "phaseId": 0,
    "title": "Finalize Architecture Design", "description": "Confirm and document final system architecture: server specs, port allocation, component layout, environment definitions (DEV/STG/PROD)",
    "start": "2026-06-09T00:00:00Z",
    "end": "2026-06-18T00:00:00Z"
  },
  {
    "phaseId": 0,
    "title": "Define Master WBS Templates",
    "description": "Governance Team to design and document master WBS templates covering all compliance categories: Legal, Technical, Environmental, Regulatory, Financing, FID",
    "start": "2026-06-09T00:00:00Z",
    "end": "2026-06-18T00:00:00Z"
  },
  {
    "phaseId": 0,
    "title": "Define Naming Convention Rules",
    "description": "Governance Team to define and document all document naming convention rules for auto-enforcement at upload time",
    "start": "2026-06-09T00:00:00Z",
    "end": "2026-06-18T00:00:00Z"
  },
  {
    "phaseId": 0,
    "title": "Configure Approval Matrix Rules",
    "description": "Define and configure the Approval Matrix for all change types and scopes (Minor/Major/Critical \u00d7 Schedule/Scope/Budget/Resource/Document/Other)",
    "start": "2026-06-09T00:00:00Z",
    "end": "2026-06-18T00:00:00Z"
  },
  {
    "phaseId": 1,
    "title": "Deploy Backend API to Staging VM",
    "description": "Clone repository, create .env from .env.example, set file permissions to 600, install production Node.js dependencies (npm ci --production)",
    "start": "2026-06-20T00:00:00Z",
    "end": "2026-07-03T00:00:00Z"
  },
  {
    "phaseId": 1,
    "title": "Apply Prisma Database Migrations",
    "description": "Run `npx prisma migrate deploy` to apply all database migrations including Session 3 schema changes (leadTimeDays, driveWebViewLink, ChangeRequestAttachment, MFA fields)",
    "start": "2026-06-20T00:00:00Z",
    "end": "2026-07-03T00:00:00Z"
  },
  {
    "phaseId": 1,
    "title": "Load Prisma Seed Data",
    "description": "Run `npm run db:seed` to load all 7 roles, permissions, and default templates into the database",
    "start": "2026-06-20T00:00:00Z",
    "end": "2026-07-03T00:00:00Z"
  },
  {
    "phaseId": 1,
    "title": "Start Backend API via PM2 with Auto-Restart",
    "description": "Start backend with `pm2 start ecosystem.config.js && pm2 save` and configure `pm2 startup` for reboot persistence",
    "start": "2026-06-20T00:00:00Z",
    "end": "2026-07-03T00:00:00Z"
  },
  {
    "phaseId": 1,
    "title": "Deploy Python ML Service",
    "description": "Create Python 3.11 venv, activate, install requirements.txt dependencies (scikit-learn, FastAPI, uvicorn, APScheduler, etc.), start via systemd",
    "start": "2026-06-20T00:00:00Z",
    "end": "2026-07-03T00:00:00Z"
  },
  {
    "phaseId": 1,
    "title": "Verify ML Models Auto-Train on First Startup",
    "description": "Confirm all 6 scikit-learn models (DocumentClassifier, ComplianceRiskPredictor, AccessAnomalyDetector, NamingConventionValidator, ChangeImpactEstimator, MilestoneImpactEstimator) generate .joblib files on startup",
    "start": "2026-06-20T00:00:00Z",
    "end": "2026-07-03T00:00:00Z"
  },
  {
    "phaseId": 1,
    "title": "Build and Deploy React SPA Frontend",
    "description": "Run `npm ci && npm run build` for the React/Vite frontend, copy dist/* to Nginx web root /var/www/track/",
    "start": "2026-06-20T00:00:00Z",
    "end": "2026-07-03T00:00:00Z"
  },
  {
    "phaseId": 1,
    "title": "Configure and Enable Nginx",
    "description": "Install Nginx config (SSL termination, /api/* \u2192 port 3000, /ml/* \u2192 port 8000, static files, gzip, rate limiting, security headers), test with `nginx -t`, enable and reload",
    "start": "2026-06-20T00:00:00Z",
    "end": "2026-07-03T00:00:00Z"
  },
  {
    "phaseId": 1,
    "title": "Initialize Google Drive Root Data Room Folder",
    "description": "Call `POST /api/data-room/init` to create the root VDR folder structure in Google Drive",
    "start": "2026-06-30T00:00:00Z",
    "end": "2026-07-03T00:00:00Z"
  },
  {
    "phaseId": 1,
    "title": "Load Master WBS Templates into Admin",
    "description": "Import finalized master WBS templates into Admin \u2192 Settings \u2192 WBS Templates",
    "start": "2026-06-30T00:00:00Z",
    "end": "2026-07-03T00:00:00Z"
  },
  {
    "phaseId": 1,
    "title": "Configure Naming Convention Rules in Admin",
    "description": "Enter all naming convention rules into Admin \u2192 Settings for automatic enforcement at document upload time",
    "start": "2026-06-30T00:00:00Z",
    "end": "2026-07-03T00:00:00Z"
  },
  {
    "phaseId": 1,
    "title": "Configure and Test SMTP Notification Email Sender",
    "description": "Configure Gmail SMTP credentials in .env and run SMTP test via Admin panel. Verify test email is received.",
    "start": "2026-06-30T00:00:00Z",
    "end": "2026-07-03T00:00:00Z"
  },
  {
    "phaseId": 1,
    "title": "Configure Approval Matrix in Admin",
    "description": "Enter all approval matrix rules for all scopes (Minor/Major/Critical) and change types via Admin \u2192 Approval Matrix",
    "start": "2026-06-30T00:00:00Z",
    "end": "2026-07-03T00:00:00Z"
  },
  {
    "phaseId": 1,
    "title": "Verify All 7 Roles Provisioned and RBAC Loaded",
    "description": "Confirm all 7 roles exist in DB and role-permission matrix is cached. Verify Admin \u2192 Settings \u2192 RBAC shows correct matrix.",
    "start": "2026-06-30T00:00:00Z",
    "end": "2026-07-03T00:00:00Z"
  },
  {
    "phaseId": 1,
    "title": "Health Check API Endpoint",
    "description": "Verify `GET https://<host>/api/health` returns `{\"status\":\"healthy\"}` confirming all services are running",
    "start": "2026-06-30T00:00:00Z",
    "end": "2026-07-03T00:00:00Z"
  },
  {
    "phaseId": 1,
    "title": "Verify Google OAuth Login Flow End-to-End",
    "description": "Complete the full Google OAuth login flow: click Sign in with Google \u2192 authenticate \u2192 land on Dashboard with correct user/role",
    "start": "2026-06-30T00:00:00Z",
    "end": "2026-07-03T00:00:00Z"
  },
  {
    "phaseId": 1,
    "title": "Smoke Test: Create Test Project + WBS",
    "description": "Create a test project in system, verify WBS auto-generates from master template, add a WBS category and line item",
    "start": "2026-06-30T00:00:00Z",
    "end": "2026-07-03T00:00:00Z"
  },
  {
    "phaseId": 1,
    "title": "Smoke Test: Upload and Validate Document",
    "description": "Upload a test document to a line item, verify it appears in Google Drive correct subfolder (VDR/Category/LineItem/file), and Validator can Approve changing status to Approved",
    "start": "2026-06-30T00:00:00Z",
    "end": "2026-07-03T00:00:00Z"
  },
  {
    "phaseId": 1,
    "title": "Smoke Test: Change Request Full Lifecycle",
    "description": "Submit a Change Request for all 6 change types (Schedule/Scope/Budget/Resource/Document/Other), approve through Approver \u2192 Validator, verify Implemented status",
    "start": "2026-06-30T00:00:00Z",
    "end": "2026-07-03T00:00:00Z"
  },
  {
    "phaseId": 1,
    "title": "Smoke Test: Morning Pulse and Deadline Reminder Emails",
    "description": "Trigger cron job manually via `POST /admin/trigger-cron`, verify Morning Pulse email received at 8:00 AM and deadline reminder at 9:00 AM for overdue items",
    "start": "2026-06-30T00:00:00Z",
    "end": "2026-07-03T00:00:00Z"
  },
  {
    "phaseId": 1,
    "title": "Smoke Test: Shared Link External Access",
    "description": "Create a shared link for a data room folder, access via incognito (external view), verify public viewer page loads correctly and shows only shared content",
    "start": "2026-06-30T00:00:00Z",
    "end": "2026-07-03T00:00:00Z"
  },
  {
    "phaseId": 1,
    "title": "Smoke Test: Dashboard Heat Map and PDF Reports",
    "description": "Verify dashboard heat map renders with correct completion percentages; generate and download all 5 PDF reports (Compliance Status, Change Management, Document Activity, Security Audit, Readiness)",
    "start": "2026-06-30T00:00:00Z",
    "end": "2026-07-03T00:00:00Z"
  },
  {
    "phaseId": 1,
    "title": "Smoke Test: Audit Log Records All Actions",
    "description": "Verify Admin \u2192 Audit Log shows entries for: login, document upload, document approval, CR submission, CR implementation, shared link creation, from smoke tests above",
    "start": "2026-06-30T00:00:00Z",
    "end": "2026-07-03T00:00:00Z"
  },
  {
    "phaseId": 1,
    "title": "Verify PM2 All Processes Online",
    "description": "Run `pm2 status` and confirm all processes (track-api, track-ml) show status 'online' with no errored or stopped processes",
    "start": "2026-06-30T00:00:00Z",
    "end": "2026-07-03T00:00:00Z"
  },
  {
    "phaseId": 1,
    "title": "Phase 1 Sign-Off: System Administrator + Governance Team Lead",
    "description": "Obtain formal written sign-off from System Administrator and Governance Team Lead confirming all Phase 1 smoke tests passed and staging environment is approved for pilot",
    "start": "2026-07-03T00:00:00Z",
    "end": "2026-07-03T00:00:00Z"
  },
  {
    "phaseId": 1,
    "title": "Write and Run Unit Tests for Backend Business Logic",
    "description": "Write Jest test suite covering: milestone impact service, auth middleware, MFA logic, bulk operations, CSV export (extend from existing Session 8 suite)",
    "start": "2026-06-20T00:00:00Z",
    "end": "2026-07-09T00:00:00Z"
  },
  {
    "phaseId": 1,
    "title": "Run E2E Test Suite (46 Tests)",
    "description": "Execute the full e2e_test.sh suite and confirm 46/46 PASS on the staging environment. Document any failures.",
    "start": "2026-06-24T00:00:00Z",
    "end": "2026-07-03T00:00:00Z"
  },
  {
    "phaseId": 1,
    "title": "Perform E2E TypeScript Build Verification",
    "description": "Run `tsc --noEmit` on both backend and frontend to confirm zero TypeScript compilation errors",
    "start": "2026-06-24T00:00:00Z",
    "end": "2026-07-03T00:00:00Z"
  },
  {
    "phaseId": 1,
    "title": "Stakeholder Demo \u2014 Roadshow (Iteration 1)",
    "description": "Conduct first stakeholder demonstration of TRACK staging environment. Present all 6 features and 2 workflows. Collect structured feedback.",
    "start": "2026-06-30T00:00:00Z",
    "end": "2026-07-09T00:00:00Z"
  },
  {
    "phaseId": 1,
    "title": "Incorporate Stakeholder Feedback into Staging",
    "description": "Review demo feedback, triage and implement High/Medium priority refinements within the staging environment",
    "start": "2026-06-30T00:00:00Z",
    "end": "2026-07-09T00:00:00Z"
  },
  {
    "phaseId": 2,
    "title": "Select 1\u20132 Pilot Projects",
    "description": "Overall PM to select 1\u20132 real projects for the controlled pilot. Projects must represent typical compliance workloads (permitting, financing, FID).",
    "start": "2026-07-11T00:00:00Z",
    "end": "2026-07-11T00:00:00Z"
  },
  {
    "phaseId": 2,
    "title": "Provision Google Workspace Accounts for Pilot Users",
    "description": "Create Google Workspace accounts for all pilot users. Ensure MFA enrollment is enforced in Workspace Admin Console.",
    "start": "2026-07-11T00:00:00Z",
    "end": "2026-07-12T00:00:00Z"
  },
  {
    "phaseId": 2,
    "title": "Assign Pilot Users to Projects with Correct Roles in TRACK",
    "description": "For each pilot user, create UserRoleAssignment in TRACK Admin \u2192 User Management. Assign roles: TopManagement, OverallProjectManager, ProjectLead, ProjectTeamMember, Validator, GovernanceTeam, SystemAdministrator as appropriate.",
    "start": "2026-07-11T00:00:00Z",
    "end": "2026-07-12T00:00:00Z"
  },
  {
    "phaseId": 2,
    "title": "Pilot Users Complete MFA Setup (TOTP Active)",
    "description": "Each pilot user must set up TOTP MFA in TRACK Account Settings (scan QR code, enter 6-digit code to confirm). System Administrator verifies MFA is active for each user.",
    "start": "2026-07-11T00:00:00Z",
    "end": "2026-07-12T00:00:00Z"
  },
  {
    "phaseId": 2,
    "title": "Conduct Role-Appropriate Training Sessions for Pilot Users",
    "description": "Governance Team to deliver training sessions tailored to each role: TopManagement (dashboard/readiness), OPM (change requests, stage gates), ProjectLead/TeamMember (WBS upload, document workflow), Validator (approve/reject), System Administrator (admin functions, audit log).",
    "start": "2026-07-11T00:00:00Z",
    "end": "2026-07-14T00:00:00Z"
  },
  {
    "phaseId": 2,
    "title": "Create Pilot Projects and Import WBS",
    "description": "Governance Team / PM to create pilot projects in TRACK and import WBS (from master template or Excel/CSV import). Verify folder structure created in Google Drive.",
    "start": "2026-07-11T00:00:00Z",
    "end": "2026-07-14T00:00:00Z"
  },
  {
    "phaseId": 2,
    "title": "Daily System Log Monitoring (Pilot Period)",
    "description": "System Administrator monitors application logs, PM2 logs, and Nginx error logs daily for errors, exceptions, or performance issues during the pilot",
    "start": "2026-07-11T00:00:00Z",
    "end": "2026-07-19T00:00:00Z"
  },
  {
    "phaseId": 2,
    "title": "Daily Notification Delivery Monitoring (Pilot Period)",
    "description": "Governance Team verifies Morning Pulse emails (8:00 AM), Deadline Reminder emails (9:00 AM), and milestone alerts (Monday 8:00 AM) are delivering correctly during the pilot",
    "start": "2026-07-11T00:00:00Z",
    "end": "2026-07-19T00:00:00Z"
  },
  {
    "phaseId": 2,
    "title": "Daily ML Model Metrics and Drift Detection Monitoring",
    "description": "System Administrator checks Prometheus /metrics endpoint daily and monitors ML drift detection status via GET /drift/status. Flag any model accuracy degradation or data drift.",
    "start": "2026-07-11T00:00:00Z",
    "end": "2026-07-19T00:00:00Z"
  },
  {
    "phaseId": 2,
    "title": "Weekly Pilot User Feedback Collection",
    "description": "Overall PM collects structured user feedback weekly during pilot via survey and one-on-one interviews. Target: satisfaction \u22654.0/5.0",
    "start": "2026-07-11T00:00:00Z",
    "end": "2026-07-19T00:00:00Z"
  },
  {
    "phaseId": 2,
    "title": "Triage and Fix Critical / High Bugs During Pilot",
    "description": "System Administrator and developer triage any bugs reported during pilot. Critical bugs must be fixed immediately; High bugs (\u22642 allowed at go-live) must have documented workarounds.",
    "start": "2026-07-11T00:00:00Z",
    "end": "2026-07-19T00:00:00Z"
  },
  {
    "phaseId": 2,
    "title": "Validate Pilot Exit Criteria: Zero Critical Bugs",
    "description": "Confirm zero critical severity bugs remain open against any feature or workflow. Document result.",
    "start": "2026-07-19T00:00:00Z",
    "end": "2026-07-19T00:00:00Z"
  },
  {
    "phaseId": 2,
    "title": "Validate Pilot Exit Criteria: Core Workflow Completion \u226595%",
    "description": "Measure completion rate for all core workflows (WF-001, WF-002) during pilot. Must be \u226595%",
    "start": "2026-07-19T00:00:00Z",
    "end": "2026-07-19T00:00:00Z"
  },
  {
    "phaseId": 2,
    "title": "Validate Pilot Exit Criteria: User Satisfaction \u22654.0/5.0",
    "description": "Calculate aggregate user satisfaction score from pilot surveys. Must be \u22654.0/5.0.",
    "start": "2026-07-19T00:00:00Z",
    "end": "2026-07-19T00:00:00Z"
  },
  {
    "phaseId": 2,
    "title": "Validate Pilot Exit Criteria: System Uptime \u226599.5%",
    "description": "Calculate system uptime percentage during pilot period. Must be \u226599.5%.",
    "start": "2026-07-19T00:00:00Z",
    "end": "2026-07-19T00:00:00Z"
  },
  {
    "phaseId": 2,
    "title": "Validate Pilot Exit Criteria: Zero Data Segregation Violations",
    "description": "Confirm zero instances of cross-project data access occurred during pilot. Audit log review required.",
    "start": "2026-07-19T00:00:00Z",
    "end": "2026-07-19T00:00:00Z"
  },
  {
    "phaseId": 2,
    "title": "Validate Pilot Exit Criteria: Notification Delivery Rate \u226599%",
    "description": "Calculate email notification delivery rate during pilot. Must be \u226599%.",
    "start": "2026-07-19T00:00:00Z",
    "end": "2026-07-19T00:00:00Z"
  },
  {
    "phaseId": 2,
    "title": "Phase 2 Go/No-Go Sign-Off",
    "description": "Obtain formal Go/No-Go decision from Top Management, Overall Project Manager, and System Administrator based on all pilot exit criteria. Must be unanimous Go to proceed to production.",
    "start": "2026-07-19T00:00:00Z",
    "end": "2026-07-19T00:00:00Z"
  },
  {
    "phaseId": 3,
    "title": "Final Code Freeze on Main Branch (T-3)",
    "description": "No further code changes to main branch after code freeze. All pending features must be merged or deferred to next release.",
    "start": "2026-07-24T00:00:00Z",
    "end": "2026-07-24T00:00:00Z"
  },
  {
    "phaseId": 3,
    "title": "Full Regression Test Suite Passes on Staging (T-3)",
    "description": "Re-run complete E2E test suite (46 tests) on staging after any pilot-period fixes. Confirm 46/46 PASS before go-live.",
    "start": "2026-07-24T00:00:00Z",
    "end": "2026-07-24T00:00:00Z"
  },
  {
    "phaseId": 3,
    "title": "Backup Any Staging Data Being Migrated (T-2)",
    "description": "Take full database backup and VM snapshot of staging data if any staging content will be migrated to production",
    "start": "2026-07-25T00:00:00Z",
    "end": "2026-07-25T00:00:00Z"
  },
  {
    "phaseId": 3,
    "title": "Communicate Maintenance Window to All Users (T-2)",
    "description": "Send maintenance window notification (email + in-app banner) to all users: Production go-live April 6, 2026 06:00\u201310:00, TRACK will be unavailable.",
    "start": "2026-07-25T00:00:00Z",
    "end": "2026-07-25T00:00:00Z"
  },
  {
    "phaseId": 3,
    "title": "Verify Production VM Health (T-1)",
    "description": "SSH into production VM, verify all infrastructure services are healthy. Check disk space, memory, CPU baseline.",
    "start": "2026-07-26T00:00:00Z",
    "end": "2026-07-26T00:00:00Z"
  },
  {
    "phaseId": 3,
    "title": "Verify All PROD Environment Variables (.env) (T-1)",
    "description": "Review and confirm all production .env variables: DATABASE_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY, SMTP credentials, JWT_SECRET, NODE_ENV=production",
    "start": "2026-07-26T00:00:00Z",
    "end": "2026-07-26T00:00:00Z"
  },
  {
    "phaseId": 3,
    "title": "Verify MFA Enforcement for All Production User Accounts (T-1)",
    "description": "Audit all production user accounts in Admin \u2192 User Management. Confirm MFA status = Active for all users. No user with mfaEnabled=false may access production.",
    "start": "2026-07-26T00:00:00Z",
    "end": "2026-07-26T00:00:00Z"
  },
  {
    "phaseId": 3,
    "title": "Rehearse Cutover Steps on Staging (Full Dry Run) (T-1)",
    "description": "Run through all 22 cutover steps (3B.1\u20133B.22) on the staging environment as a full dry run. Document time taken and any issues.",
    "start": "2026-07-26T00:00:00Z",
    "end": "2026-07-26T00:00:00Z"
  },
  {
    "phaseId": 3,
    "title": "Confirm and Test Rollback Procedure (T-1)",
    "description": "Verify VM snapshot-based rollback works on staging. Confirm full system restore in <20 minutes. Document rollback procedure.",
    "start": "2026-07-26T00:00:00Z",
    "end": "2026-07-26T00:00:00Z"
  },
  {
    "phaseId": 3,
    "title": "Go-Live Readiness Scorecard \u2014 All Items GREEN (T-1)",
    "description": "Review all 14 items on the Go-Live Readiness Scorecard. All must be GREEN (Infrastructure, Security, Application, Data, AI/ML, Reporting, Dashboards, Automations, Monitoring, Training, Documentation, Support, Rollback, Stakeholder sign-off).",
    "start": "2026-07-26T00:00:00Z",
    "end": "2026-07-26T00:00:00Z"
  },
  {
    "phaseId": 3,
    "title": "Enable Maintenance Mode \u2014 Nginx 503 Page (Cutover 06:00)",
    "description": "Update Nginx config to return 503 maintenance page. Reload Nginx. Confirm users see maintenance page.",
    "start": "2026-07-27T00:00:00Z",
    "end": "2026-07-27T00:00:00Z"
  },
  {
    "phaseId": 3,
    "title": "Take Full VM Snapshot (Cutover 06:10)",
    "description": "Take a complete VM snapshot immediately before any production changes. This is the rollback point.",
    "start": "2026-07-27T00:00:00Z",
    "end": "2026-07-27T00:00:00Z"
  },
  {
    "phaseId": 3,
    "title": "Deploy Latest Code and Run DB Migrations (Cutover 06:30\u201306:45)",
    "description": "Pull latest code (`git pull origin main`), install prod dependencies (`npm ci --production`), run DB migrations (`npx prisma migrate deploy`)",
    "start": "2026-07-27T00:00:00Z",
    "end": "2026-07-27T00:00:00Z"
  },
  {
    "phaseId": 3,
    "title": "Start Backend and ML Services (Cutover 07:00\u201307:15)",
    "description": "Restart backend (`pm2 restart track-api`), install ML deps (`pip install -r requirements.txt`), start ML service (`systemctl start track-ml`)",
    "start": "2026-07-27T00:00:00Z",
    "end": "2026-07-27T00:00:00Z"
  },
  {
    "phaseId": 3,
    "title": "Build and Deploy Frontend, Configure Production Drive and WBS Templates (Cutover 07:20\u201307:55)",
    "description": "Build frontend (`npm run build`), copy to Nginx, reload Nginx. Configure production Drive folder structure. Load production WBS templates and naming rules.",
    "start": "2026-07-27T00:00:00Z",
    "end": "2026-07-27T00:00:00Z"
  },
  {
    "phaseId": 3,
    "title": "Enable and Verify All Cron Schedules (Cutover 08:05)",
    "description": "Verify node-cron (9 business cron jobs) and APScheduler (6 ML cron jobs) are active. Confirm schedules: Morning Pulse 8AM, Deadline Reminder 9AM, Milestone Alerts Monday 8AM, Monthly Audit 1st of month 9AM, Nightly naming validation 1AM, Daily anomaly detection 2AM, ML retraining schedules.",
    "start": "2026-07-27T00:00:00Z",
    "end": "2026-07-27T00:00:00Z"
  },
  {
    "phaseId": 3,
    "title": "Run Production Smoke Tests (Cutover 08:15\u201308:40)",
    "description": "Execute all production smoke tests (all core workflows: login, create project, upload document, validate, change request, shared link, dashboard, PDF reports)",
    "start": "2026-07-27T00:00:00Z",
    "end": "2026-07-27T00:00:00Z"
  },
  {
    "phaseId": 3,
    "title": "Verify Audit Logging Active and Immutable (Cutover 08:40)",
    "description": "Confirm audit log is recording all production smoke test actions. Attempt to delete an audit record and confirm API returns 405/403. Verify append-only enforcement.",
    "start": "2026-07-27T00:00:00Z",
    "end": "2026-07-27T00:00:00Z"
  },
  {
    "phaseId": 3,
    "title": "Disable Maintenance Mode \u2014 Go Live (Cutover 09:00)",
    "description": "Update Nginx config to route traffic to the application (remove 503 maintenance page). Reload Nginx. Confirm application is accessible publicly.",
    "start": "2026-07-27T00:00:00Z",
    "end": "2026-07-27T00:00:00Z"
  },
  {
    "phaseId": 3,
    "title": "Send Go-Live Notification to All Users (Cutover 09:15)",
    "description": "Overall PM sends email notification to all users confirming TRACK is now live: access URL, getting started guide, support channel contacts",
    "start": "2026-07-27T00:00:00Z",
    "end": "2026-07-27T00:00:00Z"
  },
  {
    "phaseId": 3,
    "title": "Post-Cutover Hyper-Care: Dedicated Support Channel Active",
    "description": "Activate dedicated support channel (Slack/Teams/email) for TRACK issues. All users informed of support channel contacts and escalation path.",
    "start": "2026-07-27T00:00:00Z",
    "end": "2026-07-30T00:00:00Z"
  },
  {
    "phaseId": 3,
    "title": "Daily Hyper-Care Stand-up (09:00 Daily, T+0 to T+4)",
    "description": "Daily 09:00 stand-up to review: active issues, system metrics, ML performance, user feedback, and notification delivery",
    "start": "2026-07-27T00:00:00Z",
    "end": "2026-07-30T00:00:00Z"
  },
  {
    "phaseId": 3,
    "title": "Verify Morning Pulse and Reminder Emails Firing Correctly (T+1)",
    "description": "Confirm Morning Pulse emails fire at 8:00 AM and Deadline Reminder emails at 9:00 AM on April 7. Verify ML nightly naming validation at 1:00 AM and anomaly detection at 2:00 AM.",
    "start": "2026-07-27T00:00:00Z",
    "end": "2026-07-27T00:00:00Z"
  },
  {
    "phaseId": 3,
    "title": "ML Canary Deployment Review and Model Promotion (T+2)",
    "description": "Review ML canary deployment results (weighted routing). If canary models meet accuracy and latency targets, promote to full traffic.",
    "start": "2026-07-28T00:00:00Z",
    "end": "2026-07-28T00:00:00Z"
  },
  {
    "phaseId": 3,
    "title": "Onboard Remaining Projects (Batch) (T+2 to T+10)",
    "description": "Governance Team and OPM onboard all remaining projects in batches. For each project: create in TRACK, import WBS, assign team members with roles, verify Google Drive folders created.",
    "start": "2026-07-28T00:00:00Z",
    "end": "2026-08-03T00:00:00Z"
  },
  {
    "phaseId": 3,
    "title": "Transition from Hyper-Care to Standard Support (T+5)",
    "description": "Close hyper-care mode. Transition to standard L1\u2013L4 support model with documented SLAs: L1 Immediate, L2 4-hour, L3 2-hour, L4 30-minute.",
    "start": "2026-07-30T00:00:00Z",
    "end": "2026-07-30T00:00:00Z"
  },
  {
    "phaseId": 4,
    "title": "Conduct Formal User Acceptance Testing (UAT)",
    "description": "Test all acceptance criteria from ToR Sections 4 and 5 (F-001 through F-006, WF-001, WF-002). Every criterion must be marked PASS.",
    "start": "2026-07-11T00:00:00Z",
    "end": "2026-07-19T00:00:00Z"
  },
  {
    "phaseId": 4,
    "title": "UAT Sign-Off: F-001 Secure Data Room & Access Control",
    "description": "Obtain written sign-off from Feature Owner confirming all F-001 acceptance criteria passed: isolated VDR, data segregation, MFA enforced, audit log immutable",
    "start": "2026-07-19T00:00:00Z",
    "end": "2026-07-19T00:00:00Z"
  },
  {
    "phaseId": 4,
    "title": "UAT Sign-Off: F-002 Selective Sharing & External Access",
    "description": "Obtain written sign-off confirming all F-002 acceptance criteria passed: sub-data room isolation, expired link access-denied, external access audit logged, revoke works immediately",
    "start": "2026-07-19T00:00:00Z",
    "end": "2026-07-19T00:00:00Z"
  },
  {
    "phaseId": 4,
    "title": "UAT Sign-Off: F-003 Notifications & Reminders",
    "description": "Obtain written sign-off confirming all F-003 acceptance criteria passed: upload triggers email within 5 minutes, 7-day reminder at 9AM, overdue daily reminder, milestone alerts Monday 8AM",
    "start": "2026-07-19T00:00:00Z",
    "end": "2026-07-19T00:00:00Z"
  },
  {
    "phaseId": 4,
    "title": "UAT Sign-Off: F-004 Stage Gates, Prerequisites & Timeline",
    "description": "Obtain written sign-off confirming all F-004 acceptance criteria passed: 30% readiness when 3/10 approved, backward planning from NTP date, Gantt view correct, cannot mark stage gate complete with pending prerequisites",
    "start": "2026-07-19T00:00:00Z",
    "end": "2026-07-19T00:00:00Z"
  },
  {
    "phaseId": 4,
    "title": "UAT Sign-Off: F-005 Readiness View & Progress Tracking",
    "description": "Obtain written sign-off confirming all F-005 acceptance criteria passed: dashboard loads <3 seconds, real-time completion updates, expand/collapse category, all 5 PDF reports correct",
    "start": "2026-07-19T00:00:00Z",
    "end": "2026-07-19T00:00:00Z"
  },
  {
    "phaseId": 4,
    "title": "UAT Sign-Off: F-006 Document Ownership & Accountability",
    "description": "Obtain written sign-off confirming F-006 criteria passed: assigned owner visible, reminders only to assigned owner, 'My Items' filter works, compliance report includes owner column",
    "start": "2026-07-19T00:00:00Z",
    "end": "2026-07-19T00:00:00Z"
  },
  {
    "phaseId": 4,
    "title": "UAT Sign-Off: WF-001 Change Management Workflow",
    "description": "Obtain written sign-off confirming all WF-001 acceptance criteria passed: impact preview correct, dual-approval chain, all users notified within 5 minutes, full history in audit log",
    "start": "2026-07-19T00:00:00Z",
    "end": "2026-07-19T00:00:00Z"
  },
  {
    "phaseId": 4,
    "title": "UAT Sign-Off: WF-002 Project Setup & Document Validation",
    "description": "Obtain written sign-off confirming all WF-002 acceptance criteria passed: WBS auto-generates from template, Drive folders with naming conventions, validator notified in 5 minutes, approved documents locked",
    "start": "2026-07-19T00:00:00Z",
    "end": "2026-07-19T00:00:00Z"
  },
  {
    "phaseId": 4,
    "title": "Final Customer Sign-Off: All Features and Workflows",
    "description": "Obtain formal sign-off from Customer Representative, Overall Project Manager, Governance Team Lead, and System Administrator confirming full acceptance of TRACK delivery",
    "start": "2026-07-19T00:00:00Z",
    "end": "2026-07-19T00:00:00Z"
  },
  {
    "phaseId": 4,
    "title": "Configure and Test MFA for All Production Users",
    "description": "Verify every production user has completed MFA setup (TOTP active). Run Admin \u2192 User Management audit. Zero users with mfaEnabled=false in production.",
    "start": "2026-07-26T00:00:00Z",
    "end": "2026-07-27T00:00:00Z"
  },
  {
    "phaseId": 4,
    "title": "Verify Data Encryption in Transit (TLS 1.2+)",
    "description": "Use SSL Labs or equivalent tool to verify TLS 1.2+ is enforced, HSTS is configured, and no weak cipher suites are enabled",
    "start": "2026-07-26T00:00:00Z",
    "end": "2026-07-27T00:00:00Z"
  },
  {
    "phaseId": 4,
    "title": "Verify Data Encryption at Rest",
    "description": "Confirm AES-256 LUKS full-disk encryption is enabled on the database volume per additional security requirements",
    "start": "2026-07-26T00:00:00Z",
    "end": "2026-07-27T00:00:00Z"
  },
  {
    "phaseId": 4,
    "title": "Verify NIST CSF Security Controls Applied",
    "description": "Document and verify that NIST Cybersecurity Framework controls are applied: Identify, Protect, Detect, Respond, Recover mappings to TRACK security features",
    "start": "2026-07-23T00:00:00Z",
    "end": "2026-07-27T00:00:00Z"
  },
  {
    "phaseId": 4,
    "title": "Conduct Philippine Data Privacy Act (RA 10173) Compliance Assessment",
    "description": "Assess TRACK against RA 10173 obligations: NPC registration status, DPO appointment, privacy notice at login, Data Processing Agreement (DPA) with Cubeworks, audit log for breach notification",
    "start": "2026-07-27T00:00:00Z",
    "end": "2026-08-14T00:00:00Z"
  },
  {
    "phaseId": 4,
    "title": "Execute Data Processing Agreement (DPA) with Cubeworks",
    "description": "Client Legal and Cubeworks to execute formal DPA per RA 10173 \u00a712 requirement for data processors",
    "start": "2026-07-23T00:00:00Z",
    "end": "2026-08-14T00:00:00Z"
  },
  {
    "phaseId": 4,
    "title": "Execute NDA with All Bank Partners (External Collaborators)",
    "description": "Client Legal to execute bilateral NDAs with each bank partner or external financing entity that will access TRACK. NDAs must cover: scope of access, purpose limitation, no reproduction, return/destruction, audit rights, breach remedies, duration (3\u20135 years min).",
    "start": "2026-07-23T00:00:00Z",
    "end": "2026-08-14T00:00:00Z"
  },
  {
    "phaseId": 4,
    "title": "Implement Click-Through NDA / Terms Acceptance Gate for External Users",
    "description": "External users must accept NDA/Terms of Use on first login before accessing any data. System records acceptance timestamp and IP. (New requirement from Additional Requirements \u00a74, NDA-4)",
    "start": "2026-07-27T00:00:00Z",
    "end": "2026-08-07T00:00:00Z"
  },
  {
    "phaseId": 4,
    "title": "Configure Session Timeout and Forced Logout",
    "description": "Implement configurable inactivity session timeout (15-minute default) with automatic session termination and forced re-authentication. (AL-4 quick win)",
    "start": "2026-07-27T00:00:00Z",
    "end": "2026-08-02T00:00:00Z"
  },
  {
    "phaseId": 4,
    "title": "Implement Print Restriction and Download Restriction by Role",
    "description": "Disable browser print on document preview pages (CSS/JS). Restrict download button for external collaborators / read-only viewers by default. (AL-1 and AL-2 quick wins)",
    "start": "2026-07-27T00:00:00Z",
    "end": "2026-08-02T00:00:00Z"
  },
  {
    "phaseId": 4,
    "title": "Configure IP Whitelisting for Internal Users",
    "description": "Restrict TRACK access to corporate VPN IP range or approved IP addresses to block unauthorized network access. (AL-5)",
    "start": "2026-07-27T00:00:00Z",
    "end": "2026-08-02T00:00:00Z"
  },
  {
    "phaseId": 4,
    "title": "Configure Automated Daily Database Backups",
    "description": "Set up automated pg_dump daily backups with 30-day retention. Verify restore procedure works within 4-hour RTO.",
    "start": "2026-07-27T00:00:00Z",
    "end": "2026-07-30T00:00:00Z"
  },
  {
    "phaseId": 4,
    "title": "Configure PM2 Health Monitoring and Log Alerting",
    "description": "Set up PM2 monitoring (`pm2 monit`), configure PM2 log rotation, and set up health endpoint alerting (e.g., UptimeRobot or equivalent) for GET /api/health",
    "start": "2026-07-27T00:00:00Z",
    "end": "2026-07-30T00:00:00Z"
  },
  {
    "phaseId": 4,
    "title": "Publish User Guides, Admin Guides, and Runbooks",
    "description": "Complete and publish: User Guide (per role), System Administrator Runbook, Governance Team Admin Guide, Support Escalation Runbook",
    "start": "2026-07-27T00:00:00Z",
    "end": "2026-07-30T00:00:00Z"
  },
  {
    "phaseId": 4,
    "title": "Configure 7-Year Audit Log Retention via PostgreSQL Partitioning",
    "description": "Set up PostgreSQL table partitioning and archival policy for audit_log table to ensure minimum 7-year retention as required",
    "start": "2026-07-27T00:00:00Z",
    "end": "2026-07-30T00:00:00Z"
  },
  {
    "phaseId": 4,
    "title": "Conduct First Monthly Governance Audit",
    "description": "Governance Team conducts first formal monthly compliance audit: review naming conventions, permission assignments, audit log for anomalies, overdue items",
    "start": "2026-08-14T00:00:00Z",
    "end": "2026-08-14T00:00:00Z"
  },
  {
    "phaseId": 4,
    "title": "Review and Update Source Code Licensing Decision",
    "description": "Client to formally decide: Source Code Purchase (\u20b1500,000 one-time) vs. On-Demand Request Model. Decision must be documented and communicated to Cubeworks.",
    "start": "2026-07-23T00:00:00Z",
    "end": "2026-08-14T00:00:00Z"
  },
  {
    "phaseId": 4,
    "title": "Complete All Non-Functional Requirements Verification",
    "description": "Formally test and document evidence for all 10 NFRs: Availability 99.9%, Response Time \u22643s, Concurrent Users 100, Data Retention 7yr, Backup 30-day, Browser Support 4 browsers, Responsive Design 3 viewports, Security MFA+TLS, Scalability 50 projects, Notification Delivery \u226599%",
    "start": "2026-07-27T00:00:00Z",
    "end": "2026-08-14T00:00:00Z"
  }
]
  await db.insert(taskTable).values(tasks.map(t => {
    return {...t, supervisorId: marcus.id, start: new Date(t.start), end: new Date(t.end), phaseId: t.phaseId + 1}
  }));

  /*
  // Create tasks for Phase 2
  await db.insert(taskTable).values([
    { phaseId: phase2.id, supervisorId: marcus.id, title: "API rate limiting", description: "Enforce depth limiters and token buckets.", state: "QA approved", developerId: alex.id, start: new Date("2026-06-05"), end: new Date("2026-06-12") },
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
