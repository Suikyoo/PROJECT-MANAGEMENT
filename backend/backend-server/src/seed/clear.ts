import { dataTable, studentsTable, tagsTable } from "../lib/db/schema.ts";
import { db } from "../lib/db/index.ts";

export async function clear() {


  await db.delete(tagsTable);
  console.log("tags table cleared");

  await db.delete(dataTable);
  console.log("data table cleared");

  await db.delete(studentsTable);
  console.log("students table cleared");
}

await clear();
await db.$client.end();
