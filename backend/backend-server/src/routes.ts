import express, { type Express, static as staticServe } from "express"
import cors from "cors"
import { 
  getProjects, getProjectsById, 
  getPhasesByProjectId, getPhasesById,
  getUsers, getUserById, getUserByUsername, getPendingUsers,
  getTaskByPhaseId,
  getProjectFeedbacksByProjectId, getPhaseFeedbacksByPhaseId,
  getTasksByProjectId,
  getProjectLog, getPhaseLog,
  getAllTokens, getAllowedProjectsByTokenId, getAccessByTokenId,
} from "./lib/db/getter.ts"
import { 
  createUser, approveUser, setUserRole, deleteUser,
  createProject, createPhase,
  createTask, acceptTask, submitTask, approveTask,
  createProjectFeedback, createPhaseFeedback, createProjectLog, createPhaseLog,
  createToken, createAccess, deleteToken, deleteAccess,
} from "./lib/db/setter.ts"
import { authenticateAdmin, authenticateUser } from "./lib/auth/index.ts";
import { authorize, requireRole, validate } from "./lib/auth/middleware.ts";
import cookieParser from "cookie-parser";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import bcrypt from "bcryptjs";

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
    const { username, password } = req.body as { username?: string; password?: string };
    if (!username || !password) {
      return res.status(400).json({ error: "username or password missing" });
    }
    try {
      const token = await authenticateAdmin(username, password);
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
    const { name, username, password } = req.body as { name?: string; username?: string; password?: string };
    if (!name || !username || !password) {
      return res.status(400).json({ error: "name, username, and password are required" });
    }
    const existing = await getUserByUsername(username);
    if (existing) {
      return res.status(409).json({ error: "Username already taken" });
    }
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await createUser(name, username, passwordHash);
    return res.json({ ok: true, userId: user.id, message: "Signup pending admin approval" });
  });

  // User login (must be approved)
  app.post("/auth/login", upload.none(), async (req, res) => {
    const { username, password } = req.body as { username?: string; password?: string };
    if (!username || !password) {
      return res.status(400).json({ error: "username and password required" });
    }
    const user = await getUserByUsername(username);
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
    const token = await authenticateUser(user.id, user.role, user.username);
    res.cookie("taskCookie", `Bearer ${token}`, {
      httpOnly: true,
      sameSite: "lax",
    });
    return res.json({ ok: true, role: user.role, userId: user.id, name: user.name });
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
    return res.json({ userId: u.id, username: u.username, name: u.name, role: u.role });
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
    const { title, description, start, end } = req.body as { title?: string; description?: string; start?: string; end?: string };
    if (!title) return res.status(400).json({ error: "title required" });
    return res.json(await createTask(
      phaseId,
      res.locals.userId,
      title,
      description || "",
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
  app.post("/token/projects", validate, async (_, res) => {
    const tokenId = res.locals.tokenId!;
    return res.json(await getAllowedProjectsByTokenId(tokenId));
  });

  app.post("/token/projects/:id", validate, async (req, res) => {
    const projectId = Number(req.params.id);
    const tokenId = res.locals.tokenId!;
    const allowed = await getAllowedProjectsByTokenId(tokenId);
    if (!allowed.find(p => p.id === projectId)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    return res.json(allowed.filter(p => p.id === projectId));
  });

  app.post("/token/projects/:id/phases", validate, async (req, res) => {
    const projectId = Number(req.params.id);
    const tokenId = res.locals.tokenId!;
    const allowed = await getAllowedProjectsByTokenId(tokenId);
    if (!allowed.find(p => p.id === projectId)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    return res.json(await getPhasesByProjectId(projectId));
  });

  app.post("/token/phases/:id", validate, async (req, res) => {
    const phaseId = Number(req.params.id);
    const tokenId = res.locals.tokenId!;
    const phases = await getPhasesById(phaseId);
    if (!phases.length) return res.status(404).json({ error: "Phase not found" });
    const allowed = await getAllowedProjectsByTokenId(tokenId);
    if (!allowed.find(p => p.id === phases[0].projectId)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    return res.json(phases);
  });

  app.post("/token/phases/:id/feedbacks", validate, async (req, res) => {
    const phaseId = Number(req.params.id);
    const tokenId = res.locals.tokenId!;
    const phases = await getPhasesById(phaseId);
    if (!phases.length) return res.status(404).json({ error: "Phase not found" });
    const allowed = await getAllowedProjectsByTokenId(tokenId);
    if (!allowed.find(p => p.id === phases[0].projectId)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    return res.json(await getPhaseFeedbacksByPhaseId(phaseId));
  });

  app.post("/token/projects/:id/feedbacks", validate, async (req, res) => {
    const projectId = Number(req.params.id);
    const tokenId = res.locals.tokenId!;
    const allowed = await getAllowedProjectsByTokenId(tokenId);
    if (!allowed.find(p => p.id === projectId)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    return res.json(await getProjectFeedbacksByProjectId(projectId));
  });

  app.post("/token/projects/:id/log", validate, async (req, res) => {
    const projectId = Number(req.params.id);
    const tokenId = res.locals.tokenId!;
    const allowed = await getAllowedProjectsByTokenId(tokenId);
    if (!allowed.find(p => p.id === projectId)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    const log = await getProjectLog(projectId);
    return res.json(log || { projectId, content: "" });
  });

  app.post("/token/phases/:id/log", validate, async (req, res) => {
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

  app.post("/token/projects/:id/tasks", validate, async (req, res) => {
    const projectId = Number(req.params.id);
    const tokenId = res.locals.tokenId!;
    const allowed = await getAllowedProjectsByTokenId(tokenId);
    if (!allowed.find(p => p.id === projectId)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    return res.json(await getTasksByProjectId(projectId));
  });

  app.post("/token/phases/:id/tasks", validate, async (req, res) => {
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

}
