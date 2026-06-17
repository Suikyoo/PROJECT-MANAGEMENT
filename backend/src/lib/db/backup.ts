import { sql } from "./index.ts";

/** Generate a JSON dump of all public tables */
export async function dumpAllTables(): Promise<string> {
  const tables = await sql`SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name`;

  const result: Record<string, Record<string, unknown>[]> = {};
  for (const row of tables) {
    const table_name = (row as any).table_name as string;
    const rows = await sql.unsafe(`SELECT * FROM "${table_name}"`);
    result[table_name] = rows as Record<string, unknown>[];
  }
  return JSON.stringify(result, null, 2);
}

/** Dump a single table as JSON */
export async function dumpTable(tableName: string): Promise<string | null> {
  const exists = await sql`SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ${tableName}`;
  if (exists.length === 0) return null;
  const rows = await sql.unsafe(`SELECT * FROM "${tableName}"`);
  return JSON.stringify(rows as Record<string, unknown>[], null, 2);
}
