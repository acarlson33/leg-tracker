import { Suspense } from "react";
import { SignInWidget } from "./sign-in-widget";

export const metadata = {
  title: "Staff Login | Leg Tracker",
};

export default function LoginPage() {
  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!clerkPublishableKey) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
        <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h1 className="text-base font-semibold text-white">
            Staff login unavailable
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Configure Clerk environment variables to enable login.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md">
        <Suspense
          fallback={
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-sm text-zinc-400">
              Loading…
            </div>
          }
        >
          <SignInWidget />
        </Suspense>
      </div>
    </div>
  );
}
