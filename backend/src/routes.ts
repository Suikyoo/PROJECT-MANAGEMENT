import express, { type Express, static as staticServe } from "express"
import cors from "cors"
import { 
  getProjects, getProjectsById, 
  getPhasesByProjectId, getPhasesById,
  getUsers, getUserById, getUserByEmail, getPendingUsers,
  getTaskByPhaseId, getTaskById,
  getProjectFeedbacksByProjectId, getPhaseFeedbacksByPhaseId,
  getTasksByProjectId,
  getProjectLog, getPhaseLog,
  getAllTokens, getAllowedProjectsByTokenId, getAccessByTokenId,
  getTagsByTaskId, getTagsByProjectId, getTokenById,
  getProjectUsers, getValidOtpSession, getValidForgetSession,
} from "./lib/db/getter.ts"
import { 
  createUser, approveUser, setUserRole, deleteUser,
  createProject, createPhase,
  createTask, acceptTask, submitTask, approveTask,
  createProjectFeedback, createPhaseFeedback, createProjectLog, createPhaseLog,
  createToken, createAccess, deleteToken, deleteAccess,
  createTag, deleteTag, createOtpSession, consumeOtpSession,
  createForgetSession, consumeForgetSession, setUserPassword,
} from "./lib/db/setter.ts"
import { authenticateAdmin, authenticateUser } from "./lib/auth/index.ts";
import { authorize, requireRole, validate } from "./lib/auth/middleware.ts";
import { generateOTP, sendOTP, sendForgetUserEmail } from "./lib/auth/otp.ts";
import cookieParser from "cookie-parser";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import bcrypt from "bcryptjs";
import { googleClientId } from "./lib/env/index.ts";

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
    await createOtpSession(user.email, otp, new Date(Date.now() + 10 * 60 * 1000));
    await sendOTP(user.email, otp);
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
    /*
    const otp = generateOTP();
    await createOtpSession(user.email, otp, new Date(Date.now() + 10 * 60 * 1000));
    await sendOTP(user.email, otp);
    */
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
    /*
    const session = await getValidOtpSession(user.email, otp);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired OTP" });
    }
    await consumeOtpSession(session.id);
    */
    const token = await authenticateUser(user.id, user.role, user.email);
    res.cookie("taskCookie", `Bearer ${token}`, {
      httpOnly: true,
      sameSite: "lax",
    });
    return res.json({ ok: true, role: user.role, userId: user.id, name: user.name, email: user.email });
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
    const session = await getValidForgetSession(sessionUuid);
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
  app.get("/auth/me", authorize, async (_req, res) => {
    const users = await getUserById(res.locals.userId);
    if (!users.length) return res.status(404).json({ error: "User not found" });
    const u = users[0];
    return res.json({ userId: u.id, email: u.email, name: u.name, role: u.role });
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

  app.get("/projects/:id/feedbacks", async (req, res) => {
    const id = Number(req.params.id);
    return res.json(await getProjectFeedbacksByProjectId(id));
  });

  app.get("/phases/:id/feedbacks", async (req, res) => {
    const id = Number(req.params.id);
    return res.json(await getPhaseFeedbacksByPhaseId(id));
  });

  // ---- Protected routes (require login) ----

  app.post("/projects/:id/feedbacks", authorize, async (req, res) => {
    const projectId = Number(req.params.id);
    const { content } = req.body as { content?: string };
    if (!content) return res.status(400).json({ error: "content required" });
    const feedback = await createProjectFeedback(projectId, res.locals.userId, content);
    return res.json(feedback);
  });

  app.post("/phases/:id/feedbacks", authorize, async (req, res) => {
    const phaseId = Number(req.params.id);
    const { content } = req.body as { content?: string };
    if (!content) return res.status(400).json({ error: "content required" });
    const feedback = await createPhaseFeedback(phaseId, res.locals.userId, content);
    return res.json(feedback);
  });

  // ---- User routes ----

  app.get("/users", authorize, async (_, res) => {
    return res.json(await getUsers());
  });

  // ---- Admin-only routes ----

  app.get("/admin/users/pending", authorize, requireRole("Admin"), async (_, res) => {
    return res.json(await getPendingUsers());
  });

  app.get("/admin/users", authorize, requireRole("Admin"), async (_, res) => {
    return res.json(await getUsers());
  });

  app.post("/admin/users/:id/approve", authorize, requireRole("Admin"), async (req, res) => {
    const id = Number(req.params.id);
    return res.json(await approveUser(id, "approved"));
  });

  app.post("/admin/users/:id/reject", authorize, requireRole("Admin"), async (req, res) => {
    const id = Number(req.params.id);
    return res.json(await approveUser(id, "rejected"));
  });

  app.post("/admin/users/:id/role", authorize, requireRole("Admin"), async (req, res) => {
    const id = Number(req.params.id);
    const { role } = req.body as { role?: string };
    if (!role) return res.status(400).json({ error: "role required" });
    return res.json(await setUserRole(id, role as Parameters<typeof setUserRole>[1]));
  });

  app.delete("/admin/users/:id", authorize, requireRole("Admin"), async (req, res) => {
    const id = Number(req.params.id);
    return res.json(await deleteUser(id));
  });

  // ---- Admin token management ----

  app.get("/admin/tokens", authorize, requireRole("Admin"), async (_, res) => {
    return res.json(await getAllTokens());
  });

  app.post("/admin/tokens", authorize, requireRole("Admin"), async (req, res) => {
    const { name, expiry } = req.body as { name?: string; expiry?: number };
    if (!name || !expiry) return res.status(400).json({ error: "name and expiry required" });
    return res.json(await createToken(name, expiry));
  });

  app.delete("/admin/tokens/:id", authorize, requireRole("Admin"), async (req, res) => {
    const id = req.params.id as string;
    return res.json(await deleteToken(id));
  });

  app.get("/admin/tokens/:id/access", authorize, requireRole("Admin"), async (req, res) => {
    const id = req.params.id as string;
    return res.json(await getAccessByTokenId(id));
  });

  app.post("/admin/tokens/:id/access", authorize, requireRole("Admin"), async (req, res) => {
    const tokenId = req.params.id as string;
    const { projectId } = req.body as { projectId?: number };
    if (!projectId) return res.status(400).json({ error: "projectId required" });
    return res.json(await createAccess(tokenId, projectId));
  });

  app.delete("/admin/tokens/:id/access/:projectId", authorize, requireRole("Admin"), async (req, res) => {
    const tokenId = req.params.id as string;
    const projectId = Number(req.params.projectId);
    return res.json(await deleteAccess(tokenId, projectId));
  });

  // ---- Supervisor routes ----

  app.post("/projects", authorize, requireRole("Supervisor"), async (req, res) => {
    const { name, description } = req.body as { name?: string; description?: string };
    if (!name) return res.status(400).json({ error: "name required" });
    return res.json(await createProject(name, description || ""));
  });

  app.post("/projects/:id/phases", authorize, requireRole("Supervisor"), async (req, res) => {
    const projectId = Number(req.params.id);
    const { name } = req.body as { name?: string };
    if (!name) return res.status(400).json({ error: "name required" });
    return res.json(await createPhase(projectId, name));
  });

  app.post("/phases/:id/tasks", authorize, requireRole("Supervisor"), async (req, res) => {
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
  app.get("/phases/:id/tasks", authorize, async (req, res) => {
    const phaseId = Number(req.params.id);
    return res.json(await getTaskByPhaseId(phaseId));
  });

  // Get all tasks for a project (across all phases)
  app.get("/projects/:id/tasks", authorize, async (req, res) => {
    const projectId = Number(req.params.id);
    return res.json(await getTasksByProjectId(projectId));
  });

  // Developer: accept backlog task -> in-progress
  app.post("/tasks/:id/accept", authorize, requireRole("Developer"), async (req, res) => {
    const taskId = Number(req.params.id);
    return res.json(await acceptTask(taskId, res.locals.userId));
  });

  // Developer: submit task -> to review
  app.post("/tasks/:id/submit", authorize, requireRole("Developer"), async (req, res) => {
    const taskId = Number(req.params.id);
    return res.json(await submitTask(taskId));
  });

  // QA: approve task -> QA approved
  app.post("/tasks/:id/approve", authorize, requireRole("QA"), async (req, res) => {
    const taskId = Number(req.params.id);
    return res.json(await approveTask(taskId));
  });

  // ---- Tags ----

  // Get tags for a task
  app.get("/tasks/:id/tags", authorize, async (req, res) => {
    const taskId = Number(req.params.id);
    return res.json(await getTagsByTaskId(taskId));
  });

  // Get all tags for a project (for autocomplete suggestions)
  app.get("/projects/:id/tags", authorize, async (req, res) => {
    const projectId = Number(req.params.id);
    return res.json(await getTagsByProjectId(projectId));
  });

  app.get("/projects/:id/users", authorize, async (req, res) => {
    const projectId = Number(req.params.id);
    return res.json(await getProjectUsers(projectId));
  });

  // Add a tag to a task
  app.post("/tasks/:id/tags", authorize, requireRole("Supervisor"), async (req, res) => {
    const taskId = Number(req.params.id);
    const { name } = req.body as { name?: string };
    if (!name) return res.status(400).json({ error: "name required" });
    return res.json(await createTag(taskId, name));
  });

  // Delete a tag
  app.delete("/tags/:id", authorize, requireRole("Supervisor"), async (req, res) => {
    const id = Number(req.params.id);
    return res.json(await deleteTag(id));
  });

  // ---- Image upload ----

  app.post("/images", authorize, imageUpload.single("image"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }
    return res.json({ url: "/images/" + req.file.filename });
  });

  // ---- Project Log ----

  app.get("/projects/:id/log", authorize, async (req, res) => {
    const projectId = Number(req.params.id);
    const log = await getProjectLog(projectId);
    return res.json(log || { projectId, content: "" });
  });

  app.post("/projects/:id/log", authorize, requireRole("Supervisor"), async (req, res) => {
    const projectId = Number(req.params.id);
    const { content } = req.body as { content?: string };
    if (content === undefined) return res.status(400).json({ error: "content required" });
    return res.json(await createProjectLog(projectId, content));
  });

  // ---- Phase Log ----

  app.get("/phases/:id/log", authorize, async (req, res) => {
    const phaseId = Number(req.params.id);
    const log = await getPhaseLog(phaseId);
    return res.json(log || { phaseId, content: "" });
  });

  app.post("/phases/:id/log", authorize, requireRole("Supervisor"), async (req, res) => {
    const phaseId = Number(req.params.id);
    const { content } = req.body as { content?: string };
    if (content === undefined) return res.status(400).json({ error: "content required" });
    return res.json(await createPhaseLog(phaseId, content));
  });

  // ---- Client token routes (prefix /token/) ----
  //most of these have post on them but they're actually inquirer functions
  // Projects
  app.get("/token/:token_id/projects", validate, async (_, res) => {
    const tokenId = res.locals.tokenId!;
    return res.json(await getAllowedProjectsByTokenId(tokenId));
  });

  app.get("/token/:token_id/projects/:id", validate, async (req, res) => {
    const projectId = Number(req.params.id);
    const tokenId = res.locals.tokenId!;
    const allowed = await getAllowedProjectsByTokenId(tokenId);
    if (!allowed.find(p => p.id === projectId)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    return res.json(allowed.filter(p => p.id === projectId));
  });

  app.get("/token/:token_id/projects/:id/phases", validate, async (req, res) => {
    const projectId = Number(req.params.id);
    const tokenId = res.locals.tokenId!;
    const allowed = await getAllowedProjectsByTokenId(tokenId);
    if (!allowed.find(p => p.id === projectId)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    return res.json(await getPhasesByProjectId(projectId));
  });

  app.get("/token/:token_id/phases/:id", validate, async (req, res) => {
    const phaseId = Number(req.params.id);
    const tokenId = res.locals.tokenId!;
    const phases = await getPhasesById(phaseId);
    if (!phases.length) return res.status(404).json({ error: "Phase not found" });
    const allowed = await getAllowedProjectsByTokenId(tokenId);
    console.log("allowedProjects: ", allowed);
    console.log("phase: ", phases);
    if (!allowed.find(p => p.id === phases[0].projectId)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    return res.json(phases);
  });

  app.get("/token/:token_id/phases/:id/feedbacks", validate, async (req, res) => {
    const phaseId = Number(req.params.id);
    const tokenId = res.locals.tokenId!;
    const phases = await getPhasesById(phaseId);
    if (!phases.length) return res.status(404).json({ error: "Phase not found" });
    const allowed = await getAllowedProjectsByTokenId(tokenId);
    if (!allowed.find(p => p.id === phases[0].projectId)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    return res.json(await getPhaseFeedbacksByPhaseId(phaseId));
  })

  app.get("/token/:token_id/projects/:id/feedbacks", validate, async (req, res) => {
    const projectId = Number(req.params.id);
    const tokenId = res.locals.tokenId!;
    const allowed = await getAllowedProjectsByTokenId(tokenId);
    if (!allowed.find(p => p.id === projectId)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    return res.json(await getProjectFeedbacksByProjectId(projectId));

  })

  app.post("/token/:token_id/phases/:id/feedbacks", validate, async (req, res) => {
    const phaseId = Number(req.params.id);
    const tokenId = res.locals.tokenId!;
    const phases = await getPhasesById(phaseId);
    if (!phases.length) return res.status(404).json({ error: "Phase not found" });
    const allowed = await getAllowedProjectsByTokenId(tokenId);
    if (!allowed.find(p => p.id === phases[0].projectId)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    const { content } = req.body as { content?: string };
    if (!content) return res.status(400).json({ error: "content required" });
    const token = await getTokenById(tokenId);
    const feedback = await createPhaseFeedback(phaseId, null, content, token?.name);
    return res.json(feedback);
  });

  app.post("/token/:token_id/projects/:id/feedbacks", validate, async (req, res) => {
    const projectId = Number(req.params.id);
    const tokenId = res.locals.tokenId!;
    const allowed = await getAllowedProjectsByTokenId(tokenId);
    if (!allowed.find(p => p.id === projectId)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    const { content } = req.body as { content?: string };
    if (!content) return res.status(400).json({ error: "content required" });
    const token = await getTokenById(tokenId);
    const feedback = await createProjectFeedback(projectId, null, content, token?.name);
    return res.json(feedback);
  });

  app.get("/token/:token_id/projects/:id/log", validate, async (req, res) => {
    const projectId = Number(req.params.id);
    const tokenId = res.locals.tokenId!;
    const allowed = await getAllowedProjectsByTokenId(tokenId);
    if (!allowed.find(p => p.id === projectId)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    const log = await getProjectLog(projectId);
    return res.json(log || { projectId, content: "" });
  });

  app.get("/token/:token_id/phases/:id/log", validate, async (req, res) => {
    const phaseId = Number(req.params.id);
    const tokenId = res.locals.tokenId!;
    const phases = await getPhasesById(phaseId);
    if (!phases.length) return res.status(404).json({ error: "Phase not found" });
    const allowed = await getAllowedProjectsByTokenId(tokenId);
    if (!allowed.find(p => p.id === phases[0].projectId)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    const log = await getPhaseLog(phaseId);
    return res.json(log || { phaseId, content: "" });
  });

  app.get("/token/:token_id/projects/:id/tasks", validate, async (req, res) => {
    const projectId = Number(req.params.id);
    const tokenId = res.locals.tokenId!;
    const allowed = await getAllowedProjectsByTokenId(tokenId);
    if (!allowed.find(p => p.id === projectId)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    return res.json(await getTasksByProjectId(projectId));
  });

  app.get("/token/:token_id/phases/:id/tasks", validate, async (req, res) => {
    const phaseId = Number(req.params.id);
    const tokenId = res.locals.tokenId!;
    const phases = await getPhasesById(phaseId);
    if (!phases.length) return res.status(404).json({ error: "Phase not found" });
    const allowed = await getAllowedProjectsByTokenId(tokenId);
    if (!allowed.find(p => p.id === phases[0].projectId)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    return res.json(await getTaskByPhaseId(phaseId));
  });

  app.get("/token/:token_id/projects/:id/tags", validate, async (req, res) => {
    const projectId = Number(req.params.id);
    const tokenId = res.locals.tokenId!;
    const allowed = await getAllowedProjectsByTokenId(tokenId);
    if (!allowed.find(p => p.id === projectId)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    return res.json(await getTagsByProjectId(projectId));
  });

  app.get("/token/:token_id/projects/:id/users", validate, async (req, res) => {
    const projectId = Number(req.params.id);
    const tokenId = res.locals.tokenId!;
    const allowed = await getAllowedProjectsByTokenId(tokenId);
    if (!allowed.find(p => p.id === projectId)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    return res.json(await getProjectUsers(projectId));
  });

  app.get("/token/:token_id/tasks/:id/tags", validate, async (req, res) => {
    const taskId = Number(req.params.id);
    const tokenId = res.locals.tokenId!;
    const tasks = await getTaskById(taskId);
    if (!tasks.length) return res.status(404).json({ error: "Task not found" });
    const phase = (await getPhasesById(tasks[0].phaseId))[0];
    if (!phase) return res.status(404).json({ error: "Phase not found" });
    const allowed = await getAllowedProjectsByTokenId(tokenId);
    if (!allowed.find(p => p.id === phase.projectId)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    return res.json(await getTagsByTaskId(taskId));
  });

}
