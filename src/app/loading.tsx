import { RouteLoadingShell } from "@/components/route-loading-shell";

export default function RootLoading() {
  return (
    <RouteLoadingShell
      title="Session Docket"
      subtitle="Fetching chamber activity..."
      cardCount={2}
    />
  );
}
