import { Suspense } from "react";

import { AuthForm } from "@/components/auth/auth-form";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="h-72" />}>
      <AuthForm mode="login" />
    </Suspense>
  );
}
