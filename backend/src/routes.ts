import express, { type Express, static as staticServe } from "express"
import cors from "cors"
import { 
  getProjects, getProjectsById, 
  getPhasesByProjectId, getPhasesById,
  getUsers, getUserById, getUserByEmail, getPendingUsers,
  getTaskByPhaseId, getTaskById,
  getProjectCommentsByProjectId, getPhaseCommentsByPhaseId,
  getTasksByProjectId,
  getProjectLog, getPhaseLog,
  getAllTokens, getAccessByTokenId,
  getTagsByTaskId, getTagsByProjectId,
  getProjectUsers, getValidOtpSession, getValidForgetSession,
  getIssuesByProjectId, getIssueById, getIssueCommentsByIssueId,
  getIssueTagsByIssueId, getTagTypes, getResolutionsByIssueId,
  getIssueTransactionsByIssueId, getResolutionTransactionsByResolutionId,
  getResolvedIssueIdsByProject, isIssueResolved,
  getRolesByUserId,
} from "./lib/db/getter.ts"
import { 
  createUser, approveUser, deleteUser,
  createProject, createPhase,
  createTask, acceptTask, submitTask, approveTask,
  createProjectComment, createPhaseComment, createProjectLog, createPhaseLog,
  createToken, createAccess, deleteToken, deleteAccess,
  createTag, deleteTag, createOtpSession, consumeOtpSession,
  createForgetSession, consumeForgetSession, setUserPassword,
  createIssue, createIssueComment, createIssueTag, deleteIssueTag,
  createTagType, createResolution,
  createIssueTransaction, createResolutionTransaction,
  addUserRole, removeUserRole,
} from "./lib/db/setter.ts"
import { dumpAllTables, dumpTable } from "./lib/db/backup.ts"
import { authenticateAdmin, authenticateUser } from "./lib/auth/index.ts";
import { authenticate, requireRole, requireInsider, requireToken, restrictProject } from "./lib/auth/middleware.ts";
import { generateOTP, sendOTP, sendForgetUserEmail } from "./lib/auth/otp.ts";
import cookieParser from "cookie-parser";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import bcrypt from "bcryptjs";
import { disableOTP, googleClientId } from "./lib/env/index.ts";

const SALT_ROUNDS = 10;

export function configRoutes(app: Express) {

  app.use(cors({
    credentials: true,
  }));

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename)
  const publicDir = path.join(__dirname, "../public");
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  app.use("/images", staticServe(publicDir))

  app.use(cookieParser());
  app.use(express.json({ limit: "10mb" }));
  const upload = multer()
  const imageUpload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, publicDir),
      filename: (_req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  // ---- Public routes ----

  // Health
  app.get("/health", async (_, res) => {
    return res.json({ status: "ok" });
  });

  // Admin login
  app.post("/auth/admin/login", upload.none(), async (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      return res.status(400).json({ error: "email or password missing" });
    }
    try {
      const token = await authenticateAdmin(email, password);
      res.cookie("taskCookie", `Bearer ${token}`, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 4 * 60 * 60 * 1000, // 4 hours
      });
      return res.json({ ok: true, role: "Admin" });
    } catch {
      return res.status(401).json({ error: "Invalid admin credentials" });
    }
  });

  // User signup (pending approval)
  app.post("/auth/signup", upload.none(), async (req, res) => {
    const { name, email, password } = req.body as { name?: string; email?: string; password?: string };
    if (!name || !email || !password) {
      return res.status(400).json({ error: "name, email, and password are required" });
    }
    const existing = await getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await createUser(name, email, passwordHash);
    return res.json({ ok: true, userId: user.id, message: "Signup pending admin approval" });
  });

  // Google OAuth — verify token and return userinfo (shared helper)
  async function verifyGoogleToken(accessToken: string): Promise<{ email: string; name: string } | null> {
    try {
      const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return null;
      const data = await res.json() as { sub: string; email: string; name?: string };
      if (!data.email) return null;
      return { email: data.email, name: data.name || data.email.split("@")[0] };
    } catch {
      return null;
    }
  }

  // Google OAuth signup — creates user in pending state (same logic as /auth/signup)
  app.post("/auth/oauth/google/signup", upload.none(), async (req, res) => {
    if (!googleClientId) {
      return res.status(500).json({ error: "Google OAuth not configured" });
    }
    const { accessToken } = req.body as { accessToken?: string };
    if (!accessToken) {
      return res.status(400).json({ error: "accessToken required" });
    }
    const userinfo = await verifyGoogleToken(accessToken);
    if (!userinfo) {
      return res.status(401).json({ error: "Invalid Google token" });
    }
    const existing = await getUserByEmail(userinfo.email);
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }
    const randomPass = generateOTP() + generateOTP(); // 12 char random
    const passwordHash = await bcrypt.hash(randomPass, SALT_ROUNDS);
    const user = await createUser(userinfo.name, userinfo.email, passwordHash);
    return res.json({ ok: true, userId: user.id, message: "Signup pending admin approval" });
  });

  // Google OAuth login — checks approval, sends OTP (same logic as /auth/login)
  app.post("/auth/oauth/google/login", upload.none(), async (req, res) => {
    if (!googleClientId) {
      return res.status(500).json({ error: "Google OAuth not configured" });
    }
    const { accessToken } = req.body as { accessToken?: string };
    if (!accessToken) {
      return res.status(400).json({ error: "accessToken required" });
    }
    const userinfo = await verifyGoogleToken(accessToken);
    if (!userinfo) {
      return res.status(401).json({ error: "Invalid Google token" });
    }
    const user = await getUserByEmail(userinfo.email);
    if (!user) {
      return res.status(401).json({ error: "No account found. Please sign up first." });
    }
    if (user.approved !== "approved") {
      return res.status(403).json({ error: "Account not yet approved by admin" });
    }
    const otp = generateOTP();
    if (!disableOTP) {
      await createOtpSession(user.email, otp, new Date(Date.now() + 10 * 60 * 1000));
      await sendOTP(user.email, otp);
    }
    return res.json({ ok: true, otpRequired: true, email: user.email });
  });

  // User login (must be approved) — now requires OTP as second factor
  app.post("/auth/login", upload.none(), async (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      return res.status(400).json({ error: "email and password required" });
    }
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    if (user.approved !== "approved") {
      return res.status(403).json({ error: "Account not yet approved by admin" });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    // Generate OTP and send via email
    // TEMPORARY: AI PLEASE NOTICE THIS IF I DONT
    const otp = generateOTP();
    if (!disableOTP) {
      await createOtpSession(user.email, otp, new Date(Date.now() + 10 * 60 * 1000));
      await sendOTP(user.email, otp);
    }
    return res.json({ ok: true, otpRequired: true });
  });

  // Resend OTP
  app.post("/auth/resend-otp", upload.none(), async (req, res) => {
    const { email } = req.body as { email?: string };
    if (!email) {
      return res.status(400).json({ error: "email required" });
    }
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const otp = generateOTP();
    await createOtpSession(user.email, otp, new Date(Date.now() + 10 * 60 * 1000));
    await sendOTP(user.email, otp);
    return res.json({ ok: true });
  });

  // Verify OTP and issue session
  app.post("/auth/verify-otp", upload.none(), async (req, res) => {
    const { email, otp } = req.body as { email?: string; otp?: string };
    if (!email || !otp) {
      return res.status(400).json({ error: "email and otp required" });
    }
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    //I disabled OTP for ease of development
    //PLEASE AI PLEASE SEE THIS if I somehow forget it
    if (!disableOTP) {
      const session = await getValidOtpSession(user.email, otp);
      if (!session) {
        return res.status(401).json({ error: "Invalid or expired OTP" });
      }
      await consumeOtpSession(session.id);
    }

    const roles = await getRolesByUserId(user.id);
    const token = await authenticateUser(user.id, roles, user.email, user.name);
    res.cookie("taskCookie", `Bearer ${token}`, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 4 * 60 * 60 * 1000, // 4 hours
    });
    return res.json({ ok: true, role: roles[0] || 'Developer', roles, userId: user.id, name: user.name, email: user.email });
  });

  // Forget password — request reset link
  app.post("/auth/forget-password", upload.none(), async (req, res) => {
    const { email } = req.body as { email?: string };
    if (!email) {
      return res.status(400).json({ error: "email required" });
    }
    const user = await getUserByEmail(email);
    if (!user) {
      // Don't reveal whether the email exists
      return res.json({ ok: true, message: "If that email is registered, a reset link has been sent." });
    }
    const session = await createForgetSession(user.email, new Date(Date.now() + 10 * 60 * 1000));
    await sendForgetUserEmail(user.email, session.id);
    return res.json({ ok: true, message: "If that email is registered, a reset link has been sent." });
  });

  // Reset password via forget session
  app.post("/forget/user/:sessionUuid", upload.none(), async (req, res) => {
    const { sessionUuid } = req.params;
    const { password } = req.body as { password?: string };
    if (!password) {
      return res.status(400).json({ error: "password required" });
    }
    const session = await getValidForgetSession(sessionUuid as string);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired reset link" });
    }
    const user = await getUserByEmail(session.email);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await setUserPassword(user.id, passwordHash);
    await consumeForgetSession(session.id);
    return res.json({ ok: true, message: "Password reset successfully" });
  });

  // Logout
  app.post("/auth/logout", async (_, res) => {
    res.clearCookie("taskCookie");
    return res.json({ ok: true });
  });

  // Check current session
  app.get("/auth/me", authenticate, requireInsider, async (_req, res) => {
    const users = await getUserById(res.locals.userId);
    if (!users.length) return res.status(404).json({ error: "User not found" });
    const u = users[0];
    const roles = await getRolesByUserId(u.id);
    return res.json({ userId: u.id, email: u.email, name: u.name, role: roles[0] || 'Developer', roles });
  });

  // ---- Public read routes (for client page - no auth needed) ----

  app.get("/projects", async (_, res) => {
    return res.json(await getProjects());
  });

  app.get("/projects/:id", async (req, res) => {
    const id = Number(req.params.id);
    return res.json(await getProjectsById(id));
  });

  app.get("/projects/:id/phases", async (req, res) => {
    const id = Number(req.params.id);
    return res.json(await getPhasesByProjectId(id));
  });

  app.get("/phases/:id", async (req, res) => {
    const id = Number(req.params.id);
    return res.json(await getPhasesById(id));
  });

  app.get("/projects/:id/comments", authenticate, requireInsider, async (req, res) => {
    const id = Number(req.params.id);
    return res.json(await getProjectCommentsByProjectId(id));
  });

  app.get("/phases/:id/comments", authenticate, requireInsider, async (req, res) => {
    const id = Number(req.params.id);
    return res.json(await getPhaseCommentsByPhaseId(id));
  });

  // ---- Protected routes (require login) ----

  app.post("/projects/:id/comments", authenticate, requireInsider, async (req, res) => {
    const projectId = Number(req.params.id);
    const { content } = req.body as { content?: string };
    if (!content) return res.status(400).json({ error: "content required" });
    const comment = await createProjectComment(projectId, res.locals.userId, content, res.locals.username);
    return res.json(comment);
  });

  app.post("/phases/:id/comments", authenticate, requireInsider, async (req, res) => {
    const phaseId = Number(req.params.id);
    const { content } = req.body as { content?: string };
    if (!content) return res.status(400).json({ error: "content required" });
    const comment = await createPhaseComment(phaseId, res.locals.userId, content, res.locals.username);
    return res.json(comment);
  });

  // ---- User routes ----

  app.get("/users/:id", authenticate, requireInsider, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "invalid user id" });
    const users = await getUserById(id);
    if (!users.length) return res.status(404).json({ error: "User not found" });
    const u = users[0];
    const roles = await getRolesByUserId(id);
    return res.json({ id: u.id, name: u.name, email: u.email, role: roles[0] || 'Developer', roles });
  });

  app.get("/users", authenticate, requireInsider, async (_, res) => {
    const users = await getUsers();
    // Attach roles to each user
    const enriched = await Promise.all(users.map(async (u) => {
      const roles = await getRolesByUserId(u.id);
      return { id: u.id, name: u.name, email: u.email, approved: u.approved, role: roles[0] || 'Developer', roles };
    }));
    return res.json(enriched);
  });

  // ---- Admin-only routes ----

  app.get("/admin/users/pending", authenticate, requireRole("Admin"), async (_, res) => {
    const users = await getPendingUsers();
    const enriched = await Promise.all(users.map(async (u) => {
      const roles = await getRolesByUserId(u.id);
      return { id: u.id, name: u.name, email: u.email, approved: u.approved, role: roles[0] || 'Developer', roles };
    }));
    return res.json(enriched);
  });

  app.get("/admin/users", authenticate, requireRole("Admin"), async (_, res) => {
    const users = await getUsers();
    const enriched = await Promise.all(users.map(async (u) => {
      const roles = await getRolesByUserId(u.id);
      return { id: u.id, name: u.name, email: u.email, approved: u.approved, role: roles[0] || 'Developer', roles };
    }));
    return res.json(enriched);
  });

  app.get("/admin/users/:id", authenticate, requireRole("Admin"), async (req, res) => {
    const id = Number(req.params.id);
    const users = await getUserById(id);
    if (!users.length) return res.status(404).json({ error: "User not found" });
    const u = users[0];
    const roles = await getRolesByUserId(id);
    return res.json({ id: u.id, name: u.name, email: u.email, approved: u.approved, role: roles[0] || 'Developer', roles });
  });

  app.post("/admin/users/:id/approve", authenticate, requireRole("Admin"), async (req, res) => {
    const id = Number(req.params.id);
    return res.json(await approveUser(id, "approved"));
  });

  app.post("/admin/users/:id/reject", authenticate, requireRole("Admin"), async (req, res) => {
    const id = Number(req.params.id);
    return res.json(await approveUser(id, "rejected"));
  });

  app.post("/admin/users/:id/role", authenticate, requireRole("Admin"), async (req, res) => {
    const id = Number(req.params.id);
    const { role } = req.body as { role?: string };
    if (!role) return res.status(400).json({ error: "role required" });
    return res.json(await addUserRole(id, role));
  });

  // Manage additional user roles
  app.get("/admin/users/:id/roles", authenticate, requireRole("Admin"), async (req, res) => {
    const id = Number(req.params.id);
    return res.json(await getRolesByUserId(id));
  });

  app.post("/admin/users/:id/roles", authenticate, requireRole("Admin"), async (req, res) => {
    const id = Number(req.params.id);
    const { role } = req.body as { role?: string };
    if (!role) return res.status(400).json({ error: "role required" });
    return res.json(await addUserRole(id, role));
  });

  app.delete("/admin/users/:id/roles/:role", authenticate, requireRole("Admin"), async (req, res) => {
    const id = Number(req.params.id);
    const { role } = req.params as { role: string };
    await removeUserRole(id, role);
    return res.json({ ok: true });
  });

  app.delete("/admin/users/:id", authenticate, requireRole("Admin"), async (req, res) => {
    const id = Number(req.params.id);
    return res.json(await deleteUser(id));
  });

  // ---- Admin token management ----

  app.get("/admin/tokens", authenticate, requireRole("Admin"), async (_, res) => {
    return res.json(await getAllTokens());
  });

  app.post("/admin/tokens", authenticate, requireRole("Admin"), async (req, res) => {
    const { name, expiry } = req.body as { name?: string; expiry?: number };
    if (!name || !expiry) return res.status(400).json({ error: "name and expiry required" });
    return res.json(await createToken(name, expiry));
  });

  app.delete("/admin/tokens/:id", authenticate, requireRole("Admin"), async (req, res) => {
    const id = req.params.id as string;
    return res.json(await deleteToken(id));
  });

  app.get("/admin/tokens/:id/access", authenticate, requireRole("Admin"), async (req, res) => {
    const id = req.params.id as string;
    return res.json(await getAccessByTokenId(id));
  });

  app.post("/admin/tokens/:id/access", authenticate, requireRole("Admin"), async (req, res) => {
    const tokenId = req.params.id as string;
    const { projectId } = req.body as { projectId?: number };
    if (!projectId) return res.status(400).json({ error: "projectId required" });
    return res.json(await createAccess(tokenId, projectId));
  });

  app.delete("/admin/tokens/:id/access/:projectId", authenticate, requireRole("Admin"), async (req, res) => {
    const tokenId = req.params.id as string;
    const projectId = Number(req.params.projectId);
    return res.json(await deleteAccess(tokenId, projectId));
  });

  // ---- Admin backup ----

  app.get("/admin/backup", authenticate, requireRole("Admin"), async (req, res) => {
    const table = req.query.table as string | undefined;
    try {
      if (table) {
        const json = await dumpTable(table);
        if (json === null) return res.status(404).json({ error: `Table "${table}" not found` });
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", `attachment; filename="${table}.json"`);
        return res.send(json);
      }
      const json = await dumpAllTables();
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="database-backup.json"`);
      return res.send(json);
    } catch (e: any) {
      console.error("Backup failed:", e);
      return res.status(500).json({ error: "Backup failed", detail: e.message });
    }
  });

  // ---- Supervisor routes ----

  app.post("/projects", authenticate, requireRole("Supervisor"), async (req, res) => {
    const { name, description } = req.body as { name?: string; description?: string };
    if (!name) return res.status(400).json({ error: "name required" });
    return res.json(await createProject(name, description || ""));
  });

  app.post("/projects/:id/phases", authenticate, requireRole("Supervisor"), async (req, res) => {
    const projectId = Number(req.params.id);
    const { name } = req.body as { name?: string };
    if (!name) return res.status(400).json({ error: "name required" });
    return res.json(await createPhase(projectId, name));
  });

  app.post("/phases/:id/tasks", authenticate, requireRole("Supervisor"), async (req, res) => {
    const phaseId = Number(req.params.id);
    const { title, description, priority, start, end } = req.body as { title?: string; description?: string; priority?: "low" | "medium" | "high" | "critical"; start?: string; end?: string };
    if (!title) return res.status(400).json({ error: "title required" });
    return res.json(await createTask(
      phaseId,
      res.locals.userId,
      title,
      description || "",
      priority,
      start ? new Date(start) : undefined,
      end ? new Date(end) : undefined,
    ));
  });

  // ---- Task state transitions ----
  
  // Get tasks for a phase
  app.get("/phases/:id/tasks", authenticate, async (req, res) => {
    const phaseId = Number(req.params.id);
    // Token users: verify phase belongs to allowed project
    if (res.locals.userId === -1) {
      const phases = await getPhasesById(phaseId);
      if (!phases.length || !res.locals.allowedProjectIds?.includes(phases[0].projectId)) {
        return res.status(403).json({ error: "Unauthorized" });
      }
    }
    return res.json(await getTaskByPhaseId(phaseId));
  });

  // Get all tasks for a project (across all phases)
  app.get("/projects/:id/tasks", authenticate, restrictProject, async (req, res) => {
    const projectId = Number(req.params.id);
    return res.json(await getTasksByProjectId(projectId));
  });

  // Developer: accept backlog task -> in-progress
  app.post("/tasks/:id/accept", authenticate, requireRole("Developer"), async (req, res) => {
    const taskId = Number(req.params.id);
    return res.json(await acceptTask(taskId, res.locals.userId));
  });

  // Developer: submit task -> to review
  app.post("/tasks/:id/submit", authenticate, requireRole("Developer"), async (req, res) => {
    const taskId = Number(req.params.id);
    return res.json(await submitTask(taskId));
  });

  // QA: approve task -> QA approved
  app.post("/tasks/:id/approve", authenticate, requireRole("QA"), async (req, res) => {
    const taskId = Number(req.params.id);
    return res.json(await approveTask(taskId));
  });

  // ---- Tags ----

  // Get tags for a task
  app.get("/tasks/:id/tags", authenticate, async (req, res) => {
    const taskId = Number(req.params.id);
    // Token users: verify task belongs to allowed project
    if (res.locals.userId === -1) {
      const tasks = await getTaskById(taskId);
      if (!tasks.length) return res.status(404).json({ error: "Task not found" });
      const phases = await getPhasesById(tasks[0].phaseId);
      if (!phases.length || !res.locals.allowedProjectIds?.includes(phases[0].projectId)) {
        return res.status(403).json({ error: "Unauthorized" });
      }
    }
    return res.json(await getTagsByTaskId(taskId));
  });

  // Get all tags for a project (for autocomplete suggestions)
  app.get("/projects/:id/tags", authenticate, restrictProject, async (req, res) => {
    const projectId = Number(req.params.id);
    return res.json(await getTagsByProjectId(projectId));
  });

  app.get("/projects/:id/users", authenticate, restrictProject, async (req, res) => {
    const projectId = Number(req.params.id);
    return res.json(await getProjectUsers(projectId));
  });

  // Add a tag to a task
  app.post("/tasks/:id/tags", authenticate, requireRole("Supervisor"), async (req, res) => {
    const taskId = Number(req.params.id);
    const { name } = req.body as { name?: string };
    if (!name) return res.status(400).json({ error: "name required" });
    return res.json(await createTag(taskId, name));
  });

  // Delete a tag
  app.delete("/tags/:id", authenticate, requireRole("Supervisor"), async (req, res) => {
    const id = Number(req.params.id);
    return res.json(await deleteTag(id));
  });

  // ---- Image upload ----

  app.post("/images", authenticate, requireInsider, imageUpload.single("image"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }
    return res.json({ url: "/images/" + req.file.filename });
  });

  // ---- Project Log ----

  app.get("/projects/:id/log", authenticate, restrictProject, async (req, res) => {
    const projectId = Number(req.params.id);
    const log = await getProjectLog(projectId);
    return res.json(log || { projectId, content: "" });
  });

  app.post("/projects/:id/log", authenticate, requireRole("Supervisor"), async (req, res) => {
    const projectId = Number(req.params.id);
    const { content } = req.body as { content?: string };
    if (content === undefined) return res.status(400).json({ error: "content required" });
    return res.json(await createProjectLog(projectId, content));
  });

  // ---- Phase Log ----

  app.get("/phases/:id/log", authenticate, async (req, res) => {
    const phaseId = Number(req.params.id);
    // Token users: verify phase belongs to allowed project
    if (res.locals.userId === -1) {
      const phases = await getPhasesById(phaseId);
      if (!phases.length || !res.locals.allowedProjectIds?.includes(phases[0].projectId)) {
        return res.status(403).json({ error: "Unauthorized" });
      }
    }
    const log = await getPhaseLog(phaseId);
    return res.json(log || { phaseId, content: "" });
  });

  app.post("/phases/:id/log", authenticate, requireRole("Supervisor"), async (req, res) => {
    const phaseId = Number(req.params.id);
    const { content } = req.body as { content?: string };
    if (content === undefined) return res.status(400).json({ error: "content required" });
    return res.json(await createPhaseLog(phaseId, content));
  });

  // ---- Issue routes (insider + client tokens) ----
  
  app.get("/projects/:id/issues", authenticate, restrictProject, async (req, res) => {
    const projectId = Number(req.params.id);
    const issues = await getIssuesByProjectId(projectId);
    const resolvedIds = await getResolvedIssueIdsByProject(projectId);
    return res.json(issues.map(i => ({ ...i, resolved: resolvedIds.has(i.id) })));
  });

  app.post("/projects/:id/issues", authenticate, restrictProject, async (req, res) => {
    const projectId = Number(req.params.id);
    const { title, description, proof, priority } = req.body as { title?: string; description?: string; proof?: string; priority?: string };
    if (!title) return res.status(400).json({ error: "title required" });
    // Token users: userId = null, authorName = token.name; Insider: use real userId/username
    const userId = res.locals.userId === -1 ? null : res.locals.userId;
    const authorName = res.locals.userId === -1 ? res.locals.username : undefined;
    const issue = await createIssue(projectId, title, description || "", userId, authorName, proof, priority as any);
    return res.json(issue);
  });

  app.get("/issues/:id", authenticate, async (req, res) => {
    const id = Number(req.params.id);
    const issue = await getIssueById(id);
    if (!issue) return res.status(404).json({ error: "Issue not found" });
    // Token users: verify issue belongs to allowed project
    if (res.locals.userId === -1 && !res.locals.allowedProjectIds?.includes(issue.projectId)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    const resolved = await isIssueResolved(id);
    return res.json({ ...issue, resolved });
  });

  // Issue comments
  app.get("/issues/:id/comments", authenticate, async (req, res) => {
    const issueId = Number(req.params.id);
    return res.json(await getIssueCommentsByIssueId(issueId));
  });

  app.post("/issues/:id/comments", authenticate, async (req, res) => {
    const issueId = Number(req.params.id);
    const { content } = req.body as { content?: string };
    if (!content) return res.status(400).json({ error: "content required" });
    // Token users: userId = null, authorName = token.name; Insider: use real userId/username
    const userId = res.locals.userId === -1 ? null : res.locals.userId;
    const authorName = res.locals.username;
    const comment = await createIssueComment(issueId, userId, content, authorName);
    return res.json(comment);
  });

  // Issue tags
  app.get("/issues/:id/tags", authenticate, async (req, res) => {
    const issueId = Number(req.params.id);
    return res.json(await getIssueTagsByIssueId(issueId));
  });

  app.post("/issues/:id/tags", authenticate, requireInsider, async (req, res) => {
    const issueId = Number(req.params.id);
    const { name, tagTypeId } = req.body as { name?: string; tagTypeId?: number };
    if (!name || !tagTypeId) return res.status(400).json({ error: "name and tagTypeId required" });
    return res.json(await createIssueTag(issueId, name, tagTypeId));
  });

  app.delete("/issue-tags/:id", authenticate, requireInsider, async (req, res) => {
    const id = Number(req.params.id);
    return res.json(await deleteIssueTag(id));
  });

  // Tag types
  app.get("/tag-types", authenticate, async (_, res) => {
    return res.json(await getTagTypes());
  });

  app.post("/tag-types", authenticate, requireInsider, requireRole("Supervisor"), async (req, res) => {
    const { name } = req.body as { name?: string };
    if (!name) return res.status(400).json({ error: "name required" });
    return res.json(await createTagType(name));
  });

  // Resolutions (Supervisor only — insider only)
  app.post("/issues/:id/resolution", authenticate, requireInsider, requireRole("Supervisor"), async (req, res) => {
    const issueId = Number(req.params.id);
    const { title, description, proof } = req.body as { title?: string; description?: string; proof?: string };
    if (!title) return res.status(400).json({ error: "title required" });

    // Only allow resolution creation if issue is "testing"
    const issueTxs = await getIssueTransactionsByIssueId(issueId);
    const issueState = issueTxs.length > 0 ? issueTxs[issueTxs.length - 1].action : null;
    if (issueState !== "testing") {
      return res.status(400).json({ error: "Resolutions can only be created when the issue is in testing" });
    }

    // Check existing resolutions: allowed only if none exist, or latest was "revise"
    const existingRes = await getResolutionsByIssueId(issueId);
    if (existingRes.length > 0) {
      const latestRes = existingRes[existingRes.length - 1];
      const resTxs = await getResolutionTransactionsByResolutionId(latestRes.id);
      const lastAction = resTxs.length > 0 ? resTxs[resTxs.length - 1].action : null;
      if (lastAction !== "revise") {
        return res.status(400).json({ error: "A new resolution can only be created after the previous one was marked for revision" });
      }
    }

    return res.json(await createResolution(issueId, res.locals.userId, title, description || "", proof));
  });

  app.get("/issues/:id/resolution", authenticate, async (req, res) => {
    const issueId = Number(req.params.id);
    return res.json(await getResolutionsByIssueId(issueId));
  });

  // ---- Issue transactions (insiders only stamp) ----
  app.get("/issues/:id/transactions", authenticate, async (req, res) => {
    const issueId = Number(req.params.id);
    return res.json(await getIssueTransactionsByIssueId(issueId));
  });

  app.post("/issues/:id/transactions", authenticate, requireInsider, async (req, res) => {
    const issueId = Number(req.params.id);
    const { action, message } = req.body as { action?: string; message?: string };
    if (!action || !["open", "testing", "closed", "rejected"].includes(action)) {
      return res.status(400).json({ error: "action must be open, testing, closed, or rejected" });
    }

    // Enforce one-way state machine: open → testing → closed | rejected (no going back)
    const past = await getIssueTransactionsByIssueId(issueId);
    const current = past.length > 0 ? past[past.length - 1].action : null;
    const validTransitions: Record<string, string[]> = {
      open: ["testing", "rejected"],
      testing: ["closed", "rejected"],
      closed: [],
      rejected: [],
    };
    const allowed = current ? (validTransitions[current] || []) : [];
    if (!allowed.includes(action)) {
      return res.status(400).json({ error: `Cannot move from "${current}" to "${action}"` });
    }

    return res.json(await createIssueTransaction(issueId, action as any, res.locals.userId, undefined, res.locals.username, message));
  });

  // ---- Resolution transactions (client tokens only stamp) ----
  app.get("/resolutions/:id/transactions", authenticate, async (req, res) => {
    const resolutionId = Number(req.params.id);
    return res.json(await getResolutionTransactionsByResolutionId(resolutionId));
  });

  app.post("/resolutions/:id/transactions", authenticate, requireToken, async (req, res) => {
    const resolutionId = Number(req.params.id);
    const { action, message } = req.body as { action?: string; message?: string };
    if (!action || !["to-review", "revise", "resolved"].includes(action)) {
      return res.status(400).json({ error: "action must be to-review, revise, or resolved" });
    }

    // Each client token can only stamp a resolution once
    const past = await getResolutionTransactionsByResolutionId(resolutionId);
    if (past.some(t => t.tokenId === res.locals.tokenId)) {
      return res.status(400).json({ error: "You have already responded to this resolution" });
    }

    return res.json(await createResolutionTransaction(resolutionId, action as any, res.locals.tokenId, undefined, res.locals.username, message));
  });

}
