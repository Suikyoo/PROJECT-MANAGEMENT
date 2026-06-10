import { eq } from "drizzle-orm";
import { db } from "./index.ts";
import { dataTable, studentsTable } from "./schema.ts";


export async function addStudentById(id: number) {
  return await db
    .insert(studentsTable)
    .select(
      db.select().from(dataTable).where(eq(dataTable.id, id))
    ).onConflictDoNothing();
}
