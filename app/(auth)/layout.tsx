import { PageTransition } from "@/components/motion/page-transition";
import { Needle } from "@/components/shell/brand";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface px-4 py-10">
      <PageTransition className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Needle size={40} className="mb-4" />
          <h1 className="font-serif text-3xl tracking-tight">Cardinal OS</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your readiness, in one place.
          </p>
        </div>
        {children}
      </PageTransition>
    </div>
  );
}
