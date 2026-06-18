import { config } from "dotenv"

// Load .env for local dev. In Docker, compose sets env vars directly,
// and dotenv won't override existing env vars (override: false by default).
config({ path: "../.env" })

export const databaseUrl = process.env.DATABASE_URL;
export const adminEmail = process.env.ADMIN_EMAIL || process.env.ADMIN_USERNAME;
export const adminPassword = process.env.ADMIN_PASSWORD;
export const jwtSecret = process.env.JWT_SECRET;
export const port = process.env.PORT;
export const host = process.env.HOST;


let url = (process.env.STORAGE_HOST && process.env.STORAGE_PORT) && `${process.env.STORAGE_HOST}:${process.env.STORAGE_PORT}`;
if (!url?.startsWith("http")) {
  url = "http://" + url;
}
if (!url) {
  url = process.env.STORAGE_URL;
}
export const storageUrl = url;

export const smtpHost = process.env.SMTP_HOST;
export const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
export const smtpUser = process.env.SMTP_USER;
export const smtpPass = process.env.SMTP_PASS;
export const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
export const googleClientId = process.env.GOOGLE_CLIENT_ID;

export const disableOTP = (process.env.DISABLE_OTP === "1") ? true : false
console.log(disableOTP)

if (!port) throw new Error("Port not set. ");
if (!host) throw new Error("Host not set. ");
if (!databaseUrl) throw new Error("db url missing. ");
if (!storageUrl) throw new Error("storage url missing. ");
if (!adminEmail || !adminPassword) throw new Error("No admin email/password as env variables. ");
if (!jwtSecret) throw new Error("JWT secret unset. ");
