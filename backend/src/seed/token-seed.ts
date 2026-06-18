import { db } from "../lib/db/index.ts";
import { tokenTable, accessTable } from "../lib/db/schema.ts";

async function seedToken() {
  console.log("🪙 Seeding token...");

  // 100 years in milliseconds
  const longExpiry = 100 * 365.25 * 24 * 60 * 60 * 1000;

  const [token] = await db.insert(tokenTable).values({
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    name: "aaa-test-token",
    expiry: longExpiry,
  }).returning();
  console.log(" Token created:", token);

  // Grant access to project 1
  await db.insert(accessTable).values({
    tokenId: token.id,
    projectId: 1,
  });
  console.log(" Access granted to project 1");

  console.log("✅ Token seeded successfully!");
  console.log(`   token_id: ${token.id}`);
  console.log(`   URL: ?token_id=${token.id}`);

  process.exit(0);
}

seedToken().catch((e) => {
  console.error(e);
  process.exit(1);
});
