type RouteLoadingShellProps = {
  title: string;
  subtitle: string;
  cardCount?: number;
};

export function RouteLoadingShell({
  title,
  subtitle,
  cardCount = 3,
}: RouteLoadingShellProps) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <nav className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <span className="text-sm font-semibold tracking-tight text-white">
            LegTracker
          </span>
          <span className="h-4 w-px bg-zinc-700" />
          <span className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
            Loading
          </span>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {title}
          </h1>
          <p className="mt-1.5 text-sm text-zinc-400">{subtitle}</p>
        </div>

        <div className="space-y-3">
          {Array.from({ length: cardCount }).map((_, index) => (
            <div
              key={index}
              className="animate-pulse rounded-xl border border-zinc-800 bg-zinc-900 p-5"
            >
              <div className="h-4 w-1/3 rounded bg-zinc-800" />
              <div className="mt-3 h-3 w-2/3 rounded bg-zinc-800" />
              <div className="mt-4 h-3 w-1/2 rounded bg-zinc-800" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
