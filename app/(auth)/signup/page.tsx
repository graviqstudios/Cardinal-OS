import { Suspense } from "react";

import { AuthForm } from "@/components/auth/auth-form";

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="h-72" />}>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
