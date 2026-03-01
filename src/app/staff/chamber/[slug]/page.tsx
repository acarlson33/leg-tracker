import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { TransitionLink } from "@/components/transition-link";
import { notFound, redirect } from "next/navigation";
import {
  getBillOriginOptionsForDisplay,
  getChamberBySlugForDisplay,
  getEditableDocketForSlug,
  getOrCreateChamberRecordBySlug,
} from "@/lib/chamber-data";
import { isAdminUser } from "@/lib/admin";
import { canUpdateChamber, getUserRoleForChamber } from "@/lib/permissions";
import { getStageOptionsForDisplay } from "@/lib/stage-options";
import {
  deleteDocketBillAction,
  moveDocketBillAction,
  upsertDocketBillAction,
} from "./actions";
import { StageUpdateForm } from "./stage-update-form";

type StaffChamberPageProps = {
  params: Promise<{ slug: string }>;
};

const roleBadgeClass: Record<string, string> = {
  evaluator: "border-purple-500/30 bg-purple-500/10 text-purple-400",
  chair: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  clerk: "border-teal-500/30 bg-teal-500/10 text-teal-400",
};

export default async function StaffChamberPage({
  params,
}: StaffChamberPageProps) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/portal/login");
  }

  const { slug } = await params;
  const [
    chamber,
    chamberRecord,
    canManageRoles,
    stageOptions,
    editableDocket,
    originOptions,
  ] =
    await Promise.all([
      getChamberBySlugForDisplay(slug),
      getOrCreateChamberRecordBySlug(slug),
      isAdminUser(userId),
      getStageOptionsForDisplay(),
      getEditableDocketForSlug(slug),
      getBillOriginOptionsForDisplay(),
    ]);

  if (!chamber) {
    notFound();
  }

  const [canEdit, role] = chamberRecord
    ? await Promise.all([
        canUpdateChamber(userId, chamberRecord.id),
        getUserRoleForChamber(userId, chamberRecord.id),
      ])
    : [false, null];
  const dbSetupRequired = chamberRecord === null;
  const createOriginOptions = (...values: string[]) =>
    Array.from(
      new Set(
        values
          .map((value) => value.trim())
          .filter((value) => value.length > 0),
      ),
    );
  const addFormOriginOptions = createOriginOptions(
    chamber.name,
    chamber.body,
    ...originOptions,
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <nav
        style={{ viewTransitionName: "site-nav" }}
        className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm"
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <TransitionLink
              href="/"
              className="text-sm font-semibold text-white transition-colors hover:text-zinc-300"
            >
              LegTracker
            </TransitionLink>
            <span className="text-zinc-600">/</span>
            <span className="truncate text-sm text-zinc-400">
              {chamber.name}
            </span>
            <span className="rounded-md border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
              Staff
            </span>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            {role && (
              <span
                className={`hidden rounded-md border px-1.5 py-0.5 text-xs font-medium sm:inline-flex ${roleBadgeClass[role] ?? "border-zinc-700 bg-zinc-800 text-zinc-400"}`}
              >
                {role}
              </span>
            )}
            <TransitionLink
              href={`/chamber/${chamber.slug}`}
              className="inline-flex h-8 items-center rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              Public view
            </TransitionLink>
            {canManageRoles && (
              <Link
                href="/staff/admin"
                className="inline-flex h-8 items-center rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
              >
                Manage roles
              </Link>
            )}
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Status card */}
        <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Current Stage
              </p>
              <p className="mt-1 text-2xl font-semibold text-white">
                {chamber.currentState}
              </p>
              {chamber.currentBill && (
                <p className="mt-1 text-sm text-zinc-400">
                  {chamber.currentBill}
                </p>
              )}
            </div>
            <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/40 px-4 py-3 text-sm">
              {dbSetupRequired ? (
                <p className="text-amber-400">
                  DB not initialized — run{" "}
                  <code className="rounded bg-zinc-700 px-1 py-0.5 text-xs">
                    npm run db:migrate
                  </code>
                </p>
              ) : canEdit ? (
                <p className="text-zinc-300">
                  Editing as{" "}
                  <span
                    className={`font-medium ${
                      role === "evaluator"
                        ? "text-purple-400"
                        : role === "chair"
                          ? "text-blue-400"
                          : "text-teal-400"
                    }`}
                  >
                    {role}
                  </span>
                </p>
              ) : (
                <p className="text-zinc-500">No role assigned — view only</p>
              )}
            </div>
          </div>
        </div>

        {/* Stage grid label */}
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Update Stage
        </p>
        <StageUpdateForm
          slug={chamber.slug}
          currentState={chamber.currentState}
          canEdit={canEdit}
          stageOptions={stageOptions}
        />

        <div className="mt-10">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Edit Docket
          </p>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
            <form
              action={upsertDocketBillAction}
              className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5"
            >
              <input type="hidden" name="slug" value={slug} />
              <input
                type="text"
                name="code"
                placeholder="Bill code"
                required
                maxLength={32}
                disabled={!canEdit || dbSetupRequired}
                className="h-10 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-blue-500/50"
              />
              <input
                type="text"
                name="title"
                placeholder="Bill title"
                required
                maxLength={255}
                disabled={!canEdit || dbSetupRequired}
                className="h-10 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-blue-500/50 sm:col-span-2 lg:col-span-2"
              />
              <input
                type="text"
                name="author"
                placeholder="Author"
                required
                maxLength={120}
                disabled={!canEdit || dbSetupRequired}
                className="h-10 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-blue-500/50"
              />
              <select
                name="originBody"
                defaultValue={originOptions.includes(chamber.name) ? chamber.name : chamber.body}
                disabled={!canEdit || dbSetupRequired}
                className="h-10 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-200 outline-none transition-colors focus:border-blue-500/50"
              >
                {addFormOriginOptions.map((origin) => (
                  <option key={origin} value={origin}>
                    {origin}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={!canEdit || dbSetupRequired}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-blue-500/40 bg-blue-500/10 px-4 text-sm font-medium text-blue-300 transition-colors hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-40 lg:col-span-6 lg:justify-self-start"
              >
                Add bill to docket
              </button>
            </form>

            <div className="mt-4 space-y-3">
              {editableDocket.length === 0 && (
                <p className="rounded-lg border border-zinc-800 bg-zinc-800/40 px-3 py-2 text-sm text-zinc-400">
                  No persisted bills yet. Add the first bill above.
                </p>
              )}

              {editableDocket.map((bill) => (
                (() => {
                  const billOriginOptions = createOriginOptions(
                    bill.body,
                    chamber.name,
                    chamber.body,
                    ...originOptions,
                  );

                  return (
                <div
                  key={bill.recordId}
                  className="rounded-lg border border-zinc-800 bg-zinc-800/40 p-3"
                >
                  <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
                    <span>Position {bill.sortOrder}</span>
                    <div className="flex items-center gap-1">
                      <form action={moveDocketBillAction}>
                        <input type="hidden" name="slug" value={slug} />
                        <input
                          type="hidden"
                          name="billRecordId"
                          value={bill.recordId}
                        />
                        <input type="hidden" name="direction" value="up" />
                        <button
                          type="submit"
                          disabled={
                            !canEdit || dbSetupRequired || bill.sortOrder === 1
                          }
                          className="inline-flex h-7 items-center rounded-md border border-zinc-700 bg-zinc-800/60 px-2 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Move up
                        </button>
                      </form>
                      <form action={moveDocketBillAction}>
                        <input type="hidden" name="slug" value={slug} />
                        <input
                          type="hidden"
                          name="billRecordId"
                          value={bill.recordId}
                        />
                        <input type="hidden" name="direction" value="down" />
                        <button
                          type="submit"
                          disabled={
                            !canEdit ||
                            dbSetupRequired ||
                            bill.sortOrder === editableDocket.length
                          }
                          className="inline-flex h-7 items-center rounded-md border border-zinc-700 bg-zinc-800/60 px-2 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Move down
                        </button>
                      </form>
                    </div>
                  </div>

                  <form
                    action={upsertDocketBillAction}
                    className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5"
                  >
                    <input type="hidden" name="slug" value={slug} />
                    <input
                      type="hidden"
                      name="billRecordId"
                      value={bill.recordId}
                    />
                    <input
                      type="text"
                      name="code"
                      defaultValue={bill.code}
                      required
                      maxLength={32}
                      disabled={!canEdit || dbSetupRequired}
                      className="h-9 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-100 outline-none transition-colors focus:border-blue-500/50"
                    />
                    <input
                      type="text"
                      name="title"
                      defaultValue={bill.title}
                      required
                      maxLength={255}
                      disabled={!canEdit || dbSetupRequired}
                      className="h-9 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-100 outline-none transition-colors focus:border-blue-500/50 sm:col-span-2 lg:col-span-2"
                    />
                    <input
                      type="text"
                      name="author"
                      defaultValue={bill.author}
                      required
                      maxLength={120}
                      disabled={!canEdit || dbSetupRequired}
                      className="h-9 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-100 outline-none transition-colors focus:border-blue-500/50"
                    />
                    <select
                      name="originBody"
                      defaultValue={bill.body}
                      disabled={!canEdit || dbSetupRequired}
                      className="h-9 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-200 outline-none transition-colors focus:border-blue-500/50"
                    >
                      {billOriginOptions.map((origin) => (
                        <option key={origin} value={origin}>
                          {origin}
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-2 lg:col-span-6">
                      <button
                        type="submit"
                        disabled={!canEdit || dbSetupRequired}
                        className="inline-flex h-9 items-center rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Save changes
                      </button>
                    </div>
                  </form>
                  <form action={deleteDocketBillAction} className="mt-2">
                    <input type="hidden" name="slug" value={slug} />
                    <input
                      type="hidden"
                      name="billRecordId"
                      value={bill.recordId}
                    />
                    <button
                      type="submit"
                      disabled={!canEdit || dbSetupRequired}
                      className="inline-flex h-8 items-center rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 text-xs font-medium text-zinc-300 transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Remove bill
                    </button>
                  </form>
                </div>
                  );
                })()
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
