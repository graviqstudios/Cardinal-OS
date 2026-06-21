import { Card, CardContent } from "@/components/ui/card";

/** Cross-domain "we noticed" patterns — only rendered when there are any. */
export function TodayInsights({ insights }: { insights: string[] }) {
  if (insights.length === 0) return null;
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <p
          className="font-serif text-sm italic"
          style={{ color: "hsl(var(--module-readiness))" }}
        >
          we noticed
        </p>
        <div className="space-y-2.5">
          {insights.map((line, i) => (
            <p key={i} className="flex items-start gap-3 text-[15px] leading-relaxed">
              <span
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: "hsl(var(--module-readiness))" }}
              />
              {line}
            </p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
