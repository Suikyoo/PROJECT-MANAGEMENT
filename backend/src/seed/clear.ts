import { db } from "../lib/db/index.ts";
import { projectCommentTable, phaseCommentTable, taskTable, phaseTable, projectTable, userTable, projectLogTable, phaseLogTable } from "../lib/db/schema.ts";

async function clear() {
  console.log("🧹 Clearing database...");
  await db.delete(phaseCommentTable);
  await db.delete(projectCommentTable);
  await db.delete(phaseLogTable);
  await db.delete(projectLogTable);
  await db.delete(taskTable);
  await db.delete(phaseTable);
  await db.delete(projectTable);
  await db.delete(userTable);
  console.log("✅ Cleared all data!");
  process.exit(0);
}

clear().catch((e) => {
  console.error(e);
  process.exit(1);
});
