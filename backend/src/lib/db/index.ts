import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { databaseUrl } from '../env/index.ts';


// Disable prefetch as it is not supported for "Transaction" pool mode
const client = postgres(databaseUrl!, { prepare: false })
export const db = drizzle(client);
