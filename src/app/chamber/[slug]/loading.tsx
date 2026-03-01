import { RouteLoadingShell } from "@/components/route-loading-shell";

export default function ChamberLoading() {
  return (
    <RouteLoadingShell
      title="Chamber Docket"
      subtitle="Loading chamber details and bill queue..."
      cardCount={4}
    />
  );
}
