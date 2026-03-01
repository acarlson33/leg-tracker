"use client";

import { SignIn } from "@clerk/nextjs";

export function SignInWidget() {
  return (
    <SignIn
      path="/portal/login"
      routing="path"
      fallbackRedirectUrl="/staff/chamber/house-main"
    />
  );
}
