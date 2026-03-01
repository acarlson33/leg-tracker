import "dotenv/config";
import { db } from "@/db/client";
import { appAdmins } from "@/db/schema";

function parseCsv(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function parseArg(flag: string) {
  const index = process.argv.findIndex((value) => value === flag);
  if (index < 0) {
    return undefined;
  }

  return process.argv[index + 1];
}

async function seed() {
  const usersArg = parseArg("--users");
  const userIds = parseCsv(usersArg);

  if (userIds.length === 0) {
    console.log("No users provided. Use --users user_a,user_b.");
    return;
  }

  let createdCount = 0;

  for (const userId of userIds) {
    const inserted = await db
      .insert(appAdmins)
      .values({ userId, createdAt: new Date() })
      .onConflictDoNothing()
      .returning({ userId: appAdmins.userId });

    if (inserted.length > 0) {
      createdCount += 1;
    }
  }

  console.log(`Admin seed complete. Added ${createdCount} admin user(s).`);
}

seed()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed to seed admin users:", error);
    process.exit(1);
  });
