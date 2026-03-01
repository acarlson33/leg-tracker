import { asc, eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { appAdmins, chamberRoles, chambers } from "@/db/schema";
import { getChambersForDisplay } from "@/lib/chamber-data";
import { isAdminUser } from "@/lib/admin";
import { staffRoles } from "@/lib/permissions";
import {
  addAdminUserAction,
  assignChamberRoleAction,
  createChamberAction,
  removeAdminUserAction,
  removeChamberRoleAction,
} from "./actions";

type AdminPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const roleBadgeClass: Record<string, string> = {
  evaluator: "border-purple-500/30 bg-purple-500/10 text-purple-400",
  chair: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  clerk: "border-teal-500/30 bg-teal-500/10 text-teal-400",
};

export default async function StaffAdminPage({ searchParams }: AdminPageProps) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/portal/login");
  }

  if (!(await isAdminUser(userId))) {
    redirect("/staff/chamber/house-main");
  }

  const params = await searchParams;
  const messageValue = params.message;
  const errorValue = params.error;
  const message = Array.isArray(messageValue) ? messageValue[0] : messageValue;
  const isError = Array.isArray(errorValue)
    ? errorValue[0] === "1"
    : errorValue === "1";

  const chamberOptions = await getChambersForDisplay();

  const assignments = await db
    .select({
      chamberId: chamberRoles.chamberId,
      chamberSlug: chambers.slug,
      chamberName: chambers.name,
      userId: chamberRoles.userId,
      role: chamberRoles.role,
      createdAt: chamberRoles.createdAt,
    })
    .from(chamberRoles)
    .leftJoin(chambers, eq(chamberRoles.chamberId, chambers.id))
    .orderBy(
      asc(chambers.name),
      asc(chamberRoles.role),
      asc(chamberRoles.userId),
    )
    .catch(() => null);

  const adminUsers = await db
    .select({ userId: appAdmins.userId, createdAt: appAdmins.createdAt })
    .from(appAdmins)
    .orderBy(asc(appAdmins.userId))
    .catch(() => null);

  const dbSetupRequired = assignments === null || adminUsers === null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <nav className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="text-sm font-semibold text-white transition-colors hover:text-zinc-300"
          >
            LegTracker
          </Link>
          <span className="text-zinc-600">/</span>
          <Link
            href="/staff/chamber/house-main"
            className="text-sm text-zinc-400 transition-colors hover:text-zinc-200"
          >
            Staff
          </Link>
          <span className="text-zinc-600">/</span>
          <span className="text-sm text-zinc-300">Role Management</span>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Role Management
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Assign chamber access for evaluators, chairs, and clerks using Clerk
            user IDs.
          </p>
        </div>

        {dbSetupRequired && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-400">
            Database tables are not initialized. Run{" "}
            <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs font-mono">
              npm run db:migrate
            </code>{" "}
            to enable role management.
          </div>
        )}

        {/* Assign role */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="text-base font-semibold text-white">Assign role</h2>
          <form
            action={assignChamberRoleAction}
            className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4"
          >
            <label className="flex flex-col gap-1.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
              Chamber
              <select
                name="chamberSlug"
                required
                className="h-9 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-white focus:border-zinc-500 focus:outline-none"
              >
                {chamberOptions.map((chamber) => (
                  <option
                    key={chamber.slug}
                    value={chamber.slug}
                    className="bg-zinc-800"
                  >
                    {chamber.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium uppercase tracking-wider text-zinc-500 md:col-span-2">
              Clerk user ID
              <input
                name="targetUserId"
                required
                placeholder="user_..."
                className="h-9 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
              Role
              <select
                name="role"
                required
                className="h-9 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-white focus:border-zinc-500 focus:outline-none"
              >
                {staffRoles.map((role) => (
                  <option key={role} value={role} className="bg-zinc-800">
                    {role}
                  </option>
                ))}
              </select>
            </label>
            <div className="md:col-span-4">
              <button
                type="submit"
                className="inline-flex h-9 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-500"
              >
                Save assignment
              </button>
            </div>
          </form>

          {message && (
            <p
              className={`mt-4 rounded-lg border px-4 py-2.5 text-sm ${
                isError
                  ? "border-red-500/30 bg-red-500/10 text-red-400"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              }`}
            >
              {message}
            </p>
          )}
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="text-base font-semibold text-white">Create chamber</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Add a new chamber with a custom name. It will appear on the public
            docket and in staff tools immediately.
          </p>

          <form
            action={createChamberAction}
            className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4"
          >
            <label className="flex flex-col gap-1.5 text-xs font-medium uppercase tracking-wider text-zinc-500 md:col-span-2">
              Chamber name
              <input
                name="name"
                required
                maxLength={120}
                placeholder="Judiciary Committee"
                className="h-9 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
              Slug (optional)
              <input
                name="slug"
                maxLength={120}
                placeholder="judiciary-committee"
                className="h-9 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
              Body
              <select
                name="body"
                required
                className="h-9 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-white focus:border-zinc-500 focus:outline-none"
              >
                <option value="House" className="bg-zinc-800">
                  House
                </option>
                <option value="Senate" className="bg-zinc-800">
                  Senate
                </option>
              </select>
            </label>

            <div className="md:col-span-4">
              <button
                type="submit"
                className="inline-flex h-9 items-center rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
              >
                Create chamber
              </button>
            </div>
          </form>
        </section>

        {/* Admin users */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="text-base font-semibold text-white">Admin users</h2>
          <form
            action={addAdminUserAction}
            className="mt-4 flex flex-col gap-3 sm:flex-row"
          >
            <input
              name="targetUserId"
              required
              placeholder="user_..."
              className="h-9 flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              Add admin
            </button>
          </form>

          <ul className="mt-4 space-y-2">
            {(adminUsers ?? []).map((admin) => (
              <li
                key={admin.userId}
                className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-800/30 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-mono text-sm text-zinc-200">
                    {admin.userId}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Added {new Date(admin.createdAt).toLocaleString()}
                  </p>
                </div>
                <form action={removeAdminUserAction}>
                  <input
                    type="hidden"
                    name="targetUserId"
                    value={admin.userId}
                  />
                  <button
                    type="submit"
                    className="inline-flex h-7 items-center rounded-md border border-zinc-700 px-2.5 text-xs text-zinc-400 transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))}
            {(adminUsers ?? []).length === 0 && (
              <p className="py-4 text-sm text-zinc-500">
                No admin users configured.
              </p>
            )}
          </ul>
        </section>

        {/* Existing assignments */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="text-base font-semibold text-white">
            Existing assignments
          </h2>
          <div className="mt-4 overflow-x-auto">
            {(assignments ?? []).length === 0 ? (
              <p className="py-4 text-sm text-zinc-500">
                No role assignments yet.
              </p>
            ) : (
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="pb-2 pr-6 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Chamber
                    </th>
                    <th className="pb-2 pr-6 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      User ID
                    </th>
                    <th className="pb-2 pr-6 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Role
                    </th>
                    <th className="pb-2 pr-6 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Created
                    </th>
                    <th className="pb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {(assignments ?? []).map((assignment) => (
                    <tr
                      key={`${assignment.chamberId}:${assignment.userId}:${assignment.role}`}
                      className="align-middle"
                    >
                      <td className="py-3 pr-6 text-zinc-300">
                        {assignment.chamberName ??
                          assignment.chamberSlug ??
                          assignment.chamberId}
                      </td>
                      <td className="py-3 pr-6 font-mono text-xs text-zinc-400">
                        {assignment.userId}
                      </td>
                      <td className="py-3 pr-6">
                        <span
                          className={`inline-flex rounded-md border px-1.5 py-0.5 text-xs font-medium ${
                            roleBadgeClass[assignment.role] ??
                            "border-zinc-700 bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {assignment.role}
                        </span>
                      </td>
                      <td className="py-3 pr-6 text-xs text-zinc-500">
                        {assignment.createdAt
                          ? new Date(assignment.createdAt).toLocaleString()
                          : "—"}
                      </td>
                      <td className="py-3">
                        <form action={removeChamberRoleAction}>
                          <input
                            type="hidden"
                            name="chamberId"
                            value={assignment.chamberId}
                          />
                          <input
                            type="hidden"
                            name="chamberSlug"
                            value={assignment.chamberSlug ?? "house-main"}
                          />
                          <input
                            type="hidden"
                            name="targetUserId"
                            value={assignment.userId}
                          />
                          <button
                            type="submit"
                            className="inline-flex h-7 items-center rounded-md border border-zinc-700 px-2.5 text-xs text-zinc-400 transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
                          >
                            Remove
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
