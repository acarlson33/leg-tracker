import { RouteLoadingShell } from "@/components/route-loading-shell";

export default function StaffAdminLoading() {
  return (
    <RouteLoadingShell
      title="Role Management"
      subtitle="Loading assignments, admin access, and chamber settings..."
      cardCount={3}
    />
  );
}
