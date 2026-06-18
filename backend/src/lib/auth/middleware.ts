import type {RequestHandler} from "express"
import { verifyToken } from "./index.ts";
import { getTokenById, getRolesByUserId, getAllowedProjectsByTokenId } from "../db/getter.ts";

declare global {
  namespace Express {
    interface Locals {
      userId: number;
      roles: string[];
      email: string;
      username: string;
      tokenId?: string;
      allowedProjectIds?: number[];
    }
  }
}

// Unified authentication: client token (query/body) → JWT cookie (insider) → 401
// Token path checked FIRST so explicit token_id overrides any lingering JWT cookie
export const authenticate: RequestHandler = async (req, res, next) => {
  // ── Path 1: Client token (query param or body) ──
  const tokenId = (req.query.token_id as string) || (req.body?.token_id as string);
  if (tokenId) {
    const valid = await isValidToken(tokenId);
    if (!valid) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    const t = await getTokenById(tokenId);
    res.locals.userId = -1;
    res.locals.roles = ["Client"];
    res.locals.email = "";
    res.locals.username = t?.name || "Client";
    res.locals.tokenId = tokenId;
    // Pre-load allowed projects for access gating
    try {
      res.locals.allowedProjectIds = (await getAllowedProjectsByTokenId(tokenId)).map(p => p.id);
    } catch {
      res.locals.allowedProjectIds = [];
    }
    return next();
  }

  // ── Path 2: JWT cookie (insider users) ──
  const authHead: string | undefined = req.cookies.taskCookie;
  if (authHead) {
    const [_, token] = authHead.split(" ");
    try {
      const payload = await verifyToken(token);
      res.locals.userId = payload.userId;
      res.locals.email = payload.email;
      res.locals.username = payload.username;

      // Refresh roles from DB so role changes take effect without re-login
      if (payload.userId > 0) {
        try {
          const additionalRoles = await getRolesByUserId(payload.userId);
          res.locals.roles = additionalRoles;
        } catch {
          res.locals.roles = payload.roles;
        }
      } else {
        res.locals.roles = payload.roles; // Admin
      }
      return next();
    } catch {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
  }

  return res.status(401).json({ error: "Authentication required" });
};

// Require a specific role (or "Admin" bypass)
export const requireRole = (...roles: string[]): RequestHandler => {
  return (_req, res, next) => {
    if (res.locals.roles.includes("Admin")) return next();
    if (res.locals.roles.some(r => roles.includes(r))) return next();
    return res.status(403).json({ error: "Forbidden" });
  };
};

// Guard: reject client tokens on routes that are insider-only
// Checks if userId is -1 (token user) — returns 403 if so
export const requireInsider: RequestHandler = (_req, res, next) => {
  if (res.locals.userId === -1) {
    return res.status(403).json({ error: "Client tokens cannot access this resource" });
  }
  next();
};

// Guard: for token users, verify the project is in their allowed set
// Usage: app.get("/projects/:id/tasks", authenticate, restrictProject, handler)
export const restrictProject: RequestHandler = (req, res, next) => {
  if (res.locals.userId !== -1) return next(); // insider — no restriction
  const projectId = Number(req.params.id || req.params.project_id);
  if (!res.locals.allowedProjectIds?.includes(projectId)) {
    return res.status(403).json({ error: "Token does not have access to this project" });
  }
  next();
};

// Check if a client token is still valid (not expired)
export async function isValidToken(id: string): Promise<boolean> {
  const token = await getTokenById(id);
  if (!token) return false;
  const now = Date.now();
  const issued = new Date(token.dateIssued).getTime();
  return (now - issued) < token.expiry;
}

// Guard: only allow client token users (userId === -1), reject insiders
export const requireToken: RequestHandler = (_req, res, next) => {
  if (res.locals.userId !== -1) {
    return res.status(403).json({ error: "Only client tokens can access this resource" });
  }
  next();
};

// Legacy aliases for backward compatibility
export const authorize = authenticate;
export const validate: RequestHandler = async (req, res, next) => {
  const tokenId = req.params.token_id as string;
  if (!tokenId) return res.status(400).json({ error: "token required" });
  const valid = await isValidToken(tokenId);
  if (!valid) return res.status(401).json({ error: "Invalid or expired token" });
  res.locals.tokenId = tokenId;
  next();
};
