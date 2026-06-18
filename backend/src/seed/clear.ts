import { db, sql } from "../lib/db/index.ts";
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

  // Reset sequences so seed IDs always start from 1
  console.log("🔄 Resetting sequences...");
  await sql.unsafe(`
    ALTER SEQUENCE users_id_seq RESTART WITH 1;
    ALTER SEQUENCE projects_id_seq RESTART WITH 1;
    ALTER SEQUENCE phases_id_seq RESTART WITH 1;
    ALTER SEQUENCE tasks_id_seq RESTART WITH 1;
    ALTER SEQUENCE phase_comments_id_seq RESTART WITH 1;
    ALTER SEQUENCE project_comments_id_seq RESTART WITH 1;
  `);

  console.log("✅ Cleared all data and reset sequences!");
  process.exit(0);
}

clear().catch((e) => {
  console.error(e);
  process.exit(1);
});
