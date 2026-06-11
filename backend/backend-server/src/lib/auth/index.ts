
import * as jwt from "jose"
import { adminPassword, adminUsername, jwtSecret } from "../env/index.ts";

export interface JwtPayload {
  userId: number;
  role: string;
  username: string;
}

export async function createToken(payload: JwtPayload): Promise<string> {
  const secret = new TextEncoder().encode(jwtSecret);
  return await new jwt.SignJWT(payload as unknown as jwt.JWTPayload)
    .setProtectedHeader({alg: "HS256"})
    .setExpirationTime('3h')
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const secret = new TextEncoder().encode(jwtSecret);
  const { payload } = await jwt.jwtVerify(token, secret);
  return payload as unknown as JwtPayload;
}

export async function authenticateAdmin(username: string, password: string) {
  if (username === adminUsername && password === adminPassword) {
    const token = await createToken({ userId: 0, role: "Admin", username });
    return token;
  }
  throw new Error("info doesn't match");
}

export async function authenticateUser(userId: number, role: string, username: string) {
  return await createToken({ userId, role, username });
}

