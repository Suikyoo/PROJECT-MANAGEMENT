import { configDotenv } from "dotenv"
configDotenv({path: "../.env"})

export const databaseUrl = process.env.DATABASE_URL;
export const adminUsername = process.env.ADMIN_USERNAME;
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

if (!port) throw new Error("Port not set. ");
if (!host) throw new Error("Host not set. ");
if (!databaseUrl) throw new Error("db url missing. ");
if (!storageUrl) throw new Error("storage url missing. ");
if (!adminUsername || !adminPassword) throw new Error("No admin username/password as env variables. ");
if (!jwtSecret) throw new Error("JWT secret unset. ");
