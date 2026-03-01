import { RouteLoadingShell } from "@/components/route-loading-shell";

export default function StaffChamberLoading() {
  return (
    <RouteLoadingShell
      title="Staff Console"
      subtitle="Loading permissions, stage controls, and docket editor..."
      cardCount={3}
    />
  );
}
