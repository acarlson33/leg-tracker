import { TransitionLink } from "@/components/transition-link";
import { getChambersForDisplay } from "@/lib/chamber-data";
import { getStageOptionsForDisplay } from "@/lib/stage-options";

// Including force-dynamic conflicts with cache components, so we don't have it here.

function stageColorClass(state: string): string {
  const s = state.toLowerCase();
  if (s.includes("voting"))
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  if (s.includes("debate") || s.includes("question") || s.includes("amendment"))
    return "border-amber-500/30 bg-amber-500/10 text-amber-400";
  if (s.includes("summation"))
    return "border-blue-500/30 bg-blue-500/10 text-blue-400";
  return "border-zinc-700 bg-zinc-800 text-zinc-400";
}

function StageBadge({ state }: { state: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${stageColorClass(state)}`}
    >
      {state}
    </span>
  );
}

export default async function Home() {
  const chambers = await getChambersForDisplay();
  const stageOptions = await getStageOptionsForDisplay();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <nav
        style={{ viewTransitionName: "site-nav" }}
        className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm"
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <span className="text-sm font-semibold tracking-tight text-white">
            LegTracker
          </span>
          <span className="h-4 w-px bg-zinc-700" />
          <span className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Live session
          </span>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Session Docket
          </h1>
          <p className="mt-1.5 text-sm text-zinc-400">
            Live chamber tracking for the current mock-congress session.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {chambers.map((chamber) => {
            const activeCount = chamber.docket.length > 0 ? 1 : 0;
            const queuedCount = Math.max(chamber.docket.length - 1, 0);

            return (
            <article
              key={chamber.slug}
              style={{ viewTransitionName: `chamber-${chamber.slug}` }}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition-colors hover:border-zinc-700"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-white">
                      {chamber.name}
                    </h2>
                    <span className="rounded-md border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
                      {chamber.body}
                    </span>
                  </div>
                  <p className="mt-2 truncate text-sm text-zinc-300">
                    {chamber.currentBill ?? "No active bill"}
                  </p>
                </div>
                <StageBadge state={chamber.currentState} />
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-zinc-800 pt-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="inline-flex items-center rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 font-medium text-emerald-400">
                      {activeCount} Active
                    </span>
                    <span className="inline-flex items-center rounded-md border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 font-medium text-zinc-400">
                      {queuedCount} Queued
                    </span>
                  </div>
                  <span className="block text-xs text-zinc-600">
                  {chamber.docket.length} bill
                  {chamber.docket.length !== 1 ? "s" : ""} on docket
                  </span>
                </div>
                <TransitionLink
                  href={`/chamber/${chamber.slug}`}
                  className="text-xs font-medium text-blue-400 transition-colors hover:text-blue-300"
                >
                  View docket →
                </TransitionLink>
              </div>
            </article>
          );
          })}
        </div>

        <div className="mt-10">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Stage Reference
          </p>
          <div className="flex flex-wrap gap-2">
            {stageOptions.map((state, i) => (
              <span
                key={state}
                className="flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-400"
              >
                <span className="font-mono text-zinc-600">{i + 1}</span>
                {state}
              </span>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
