import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Load .env for local dev. In Docker, compose sets DATABASE_URL directly,
// and dotenv won't override existing env vars (override: false by default).
config({ path: '../.env' });

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

export default defineConfig({
	schema: './src/lib/db/schema.ts',
	dialect: 'postgresql',
	dbCredentials: { url: process.env.DATABASE_URL },
	verbose: true,
	strict: true
});
