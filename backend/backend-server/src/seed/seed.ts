import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { readFile } from "fs/promises";
import { dataTable, studentsTable, tagsTable } from "../lib/db/schema.ts";
import { db } from "../lib/db/index.ts";
import { join } from "path";
import XLSX from "xlsx";

interface Tag {
  id: string;
  title: string;
  metaData1: string;
  metaData2: string;
}
export async function seed(): Promise<void>{
  const file = await readFile("src/seed/data.txt", "utf-8");


  const workbook = XLSX.readFile('src/seed/data.xlsx', { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null }) as Tag[]; // array of objects

  const students: InferSelectModel<typeof dataTable>[] = [];
  const tags: InferInsertModel<typeof tagsTable>[] = [];

  for (const entry of file.split("\n")) {
    const [name, id] = entry.split("-");
    if (!name || !id) {
      console.log(`ohoy skipped entry: ${entry}. name: ${name}, id: ${id}`);
      continue
    }
    const student: InferSelectModel<typeof dataTable> = {
      name,
      id: Number(id),
      imgs: [
        join(id.trim() + "_0" + ".jpeg"),
        join(id.trim() + "_1" + ".jpeg"),
      ],
    }

    const userTags = rows.filter(v => Number(v.id) === Number(id));
    for (const t of userTags) {
      const tag: InferInsertModel<typeof tagsTable> = {
        userId: Number(id),
        title: t.title,
        metaData1: t.metaData1,
        metaData2: t.metaData2,
      }
      tags.push(tag);
    }
    
    students.push(student);
  }

  console.log(tags);
  await db.delete(tagsTable);
  console.log("tags table cleared");
  await db.insert(tagsTable).values(tags);
  console.log("tags table seeded");

  await db.delete(dataTable);
  console.log("data table cleared");
  await db.insert(dataTable).values(students);
  console.log("data table seeded");

  await db.delete(studentsTable);
  console.log("students table cleared");

}

await seed();
await db.$client.end();
