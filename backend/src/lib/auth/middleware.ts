import type {RequestHandler} from "express"
import { verifyToken } from "./index.ts";
import { getTokenById } from "../db/getter.ts";

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

// Block requests without valid JWT, extract payload into res.locals
export const authorize: RequestHandler = async (req, res, next) => {
  const authHead: string = req.cookies.taskCookie;
  if (!authHead) {
    return res.sendStatus(401);
  }

  const [ _, token ] = authHead.split(" ");

  try {
    const payload = await verifyToken(token);
    res.locals.userId = payload.userId;
    res.locals.roles = payload.roles;
    res.locals.email = payload.email;
    res.locals.username = payload.username;
  } catch (e) {
    return res.sendStatus(401);
  }

  next();
};

// Require a specific role (or "Admin" bypass)
export const requireRole = (...roles: string[]): RequestHandler => {
  return (_req, res, next) => {
    if (res.locals.roles.includes("Admin")) return next();
    if (res.locals.roles.some(r => roles.includes(r))) return next();
    return res.sendStatus(403);
  };
};

// Check if a client token is still valid (not expired)
export async function isValidToken(id: string): Promise<boolean> {
  const token = await getTokenById(id);
  if (!token) return false;
  const now = Date.now();
  const issued = new Date(token.dateIssued).getTime();
  return (now - issued) < token.expiry;
}

// Validate client token from req.body.token
export const validate: RequestHandler = async (req, res, next) => {
  const tokenId = req.params.token_id as string;
  if (!tokenId) {
    return res.status(400).json({ error: "token required" });
  }
  const valid = await isValidToken(tokenId);
  if (!valid) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
  res.locals.tokenId = tokenId;
  next();
};
