import { existsSync, readFileSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

type EnvMap = Record<string, string>;

function parseEnvFile(content: string): EnvMap {
  const entries: EnvMap = {};

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex < 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (!key) {
      continue;
    }

    entries[key] = value;
  }

  return entries;
}

function hasRealValue(value: string | undefined) {
  if (!value) {
    return false;
  }

  const normalized = value.trim();
  if (!normalized) {
    return false;
  }

  const placeholders = [
    "your_key_here",
    "pk_test_xxx",
    "sk_test_xxx",
    "postgres://username:password@host:5432/database",
    "sql://username:password@host:port/database?sslmode=verify-full",
  ];

  return !placeholders.includes(normalized);
}

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  return result.status === 0;
}

async function main() {
  const root = process.cwd();
  const envExamplePath = join(root, ".env.example");
  const envLocalPath = join(root, ".env.local");

  if (!existsSync(envLocalPath)) {
    copyFileSync(envExamplePath, envLocalPath);
    console.log("✅ Created .env.local from .env.example");
    console.log(
      "📝 Fill in your real keys in .env.local, then run: bun run setup",
    );
    return;
  }

  const env = parseEnvFile(readFileSync(envLocalPath, "utf8"));
  const requiredKeys = [
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "CLERK_SECRET_KEY",
    "DATABASE_URL",
  ] as const;

  const missing = requiredKeys.filter((key) => !hasRealValue(env[key]));

  if (missing.length > 0) {
    console.log("⚠️ Setup paused. Missing real values in .env.local for:");
    for (const key of missing) {
      console.log(`  - ${key}`);
    }
    console.log("\nAfter updating .env.local, run: bun run setup");
    return;
  }

  console.log("\n📦 Running database migrations...");
  const migrated = run("bun", ["run", "db:migrate"]);
  if (!migrated) {
    process.exit(1);
  }

  const adminUsers = env.LEGTRACKER_INITIAL_ADMIN_USERS?.trim();
  if (adminUsers) {
    console.log("\n👤 Seeding initial admin users...");
    const seededAdmins = run("bun", [
      "run",
      "seed:admins",
      "--",
      "--users",
      adminUsers,
    ]);
    if (!seededAdmins) {
      process.exit(1);
    }
  }

  const staffUsers = env.LEGTRACKER_INITIAL_STAFF_USERS?.trim();
  if (staffUsers) {
    const staffRole = env.LEGTRACKER_INITIAL_STAFF_ROLE?.trim() || "evaluator";
    const staffChambers =
      env.LEGTRACKER_INITIAL_STAFF_CHAMBERS?.trim() || "house-main,senate-main";

    console.log("\n🧩 Seeding initial staff roles...");
    const seededRoles = run("bun", [
      "run",
      "seed:roles",
      "--",
      "--users",
      staffUsers,
      "--role",
      staffRole,
      "--chambers",
      staffChambers,
    ]);

    if (!seededRoles) {
      process.exit(1);
    }
  }

  console.log("\n✅ Setup complete!");
  console.log("Run this next: bun run dev");
}

main().catch((error) => {
  console.error("Setup failed:", error);
  process.exit(1);
});
