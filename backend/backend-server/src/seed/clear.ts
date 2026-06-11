import { db } from "../lib/db/index.ts";
import { commentTable, taskTable, phaseTable, projectTable, userTable } from "../lib/db/schema.ts";

async function clear() {
  console.log("🧹 Clearing database...");
  await db.delete(commentTable);
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
