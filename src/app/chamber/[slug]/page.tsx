import { TransitionLink } from "@/components/transition-link";
import { notFound } from "next/navigation";
import { getChamberBySlugForDisplay } from "@/lib/chamber-data";

type ChamberPageProps = {
  params: Promise<{ slug: string }>;
};

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

export default async function ChamberPage({ params }: ChamberPageProps) {
  const { slug } = await params;
  const chamber = await getChamberBySlugForDisplay(slug);

  if (!chamber) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <nav
        style={{ viewTransitionName: "site-nav" }}
        className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm"
      >
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4 sm:px-6 lg:px-8">
          <TransitionLink
            href="/"
            className="text-sm font-semibold text-white transition-colors hover:text-zinc-300"
          >
            LegTracker
          </TransitionLink>
          <span className="text-zinc-600">/</span>
          <span className="text-sm text-zinc-400">{chamber.name}</span>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Chamber header card */}
        <div
          style={{ viewTransitionName: `chamber-${slug}` }}
          className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900 p-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold text-white">
                  {chamber.name}
                </h1>
                <span className="rounded-md border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
                  {chamber.body}
                </span>
                <StageBadge state={chamber.currentState} />
              </div>
              <p className="mt-2 text-sm text-zinc-400">
                Active bill:{" "}
                <span className="text-zinc-200">
                  {chamber.currentBill ?? "None"}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Docket */}
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Upcoming Docket
        </p>
        <div className="space-y-2">
          {chamber.docket.map((bill, i) => {
            const isActive = i === 0;

            return (
            <div
              key={bill.id}
              className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4"
            >
              <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-zinc-800 font-mono text-xs text-zinc-500">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md border border-zinc-700 bg-zinc-800/80 px-1.5 py-0.5 font-mono text-xs text-zinc-300">
                    {bill.id}
                  </span>
                  <span className="text-sm font-medium text-white">
                    {bill.title}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                  <span>{bill.author}</span>
                  <span className="rounded-md border border-zinc-800 bg-zinc-800/50 px-1.5 py-0.5 text-zinc-400">
                    {bill.body}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
                      isActive
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-zinc-700 bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {isActive ? "Active" : "Queued"}
                  </span>
                </div>
              </div>
            </div>
          );
          })}
          {chamber.docket.length === 0 && (
            <p className="py-8 text-center text-sm text-zinc-500">
              No bills currently on the docket.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
