import { Suspense } from "react";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="h-72" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
