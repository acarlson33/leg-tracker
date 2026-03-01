import { RouteLoadingShell } from "@/components/route-loading-shell";

export default function LoginLoading() {
  return (
    <RouteLoadingShell
      title="Staff Login"
      subtitle="Preparing secure sign-in..."
      cardCount={1}
    />
  );
}
