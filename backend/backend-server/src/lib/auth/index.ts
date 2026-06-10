
import * as jwt from "jose"
import { adminPassword, adminUsername, jwtSecret } from "../env/index.ts";

export async function authenticate(username: string, password: string) {
  const secret = new TextEncoder().encode(jwtSecret);
  if (username === adminUsername && password === adminPassword) {
    const token = await new jwt.SignJWT({})
    .setProtectedHeader({alg: "HS256"})
    .setExpirationTime('3h')
    .sign(secret);

    return token;

  }
  throw new Error("info doesn't match");

}

