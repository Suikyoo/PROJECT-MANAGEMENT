import type {RequestHandler} from "express"
import { verifyToken } from "./index.ts";

declare global {
  namespace Express {
    interface Locals {
      userId: number;
      role: string;
      username: string;
    }
  }
}

// Block requests without valid JWT, extract payload into res.locals
export const authorize: RequestHandler = async (req, res, next) => {
  const authHead: string = req.cookies.inscriberCookie;
  if (!authHead) {
    return res.sendStatus(401);
  }

  const [ _, token ] = authHead.split(" ");

  try {
    const payload = await verifyToken(token);
    res.locals.userId = payload.userId;
    res.locals.role = payload.role;
    res.locals.username = payload.username;
  } catch (e) {
    return res.sendStatus(401);
  }

  next();
};

// Require a specific role (or "Admin" bypass)
export const requireRole = (...roles: string[]): RequestHandler => {
  return (_req, res, next) => {
    if (res.locals.role === "Admin") return next();
    if (roles.includes(res.locals.role)) return next();
    return res.sendStatus(403);
  };
};
