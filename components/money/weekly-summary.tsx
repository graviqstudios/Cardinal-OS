"use client";

import * as React from "react";
import { Loader2, Sparkles } from "lucide-react";

import { generateWeeklySummary } from "@/lib/money/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tap } from "@/components/motion/tap";

export function WeeklySummary() {
  const [text, setText] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function run() {
    setLoading(true);
    const res = await generateWeeklySummary();
    setLoading(false);
    if (res.ok) setText(res.data?.text ?? "");
    else setText(res.error);
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Weekly summary</CardTitle>
        <Tap className="inline-flex">
          <Button variant="secondary" size="sm" onClick={run} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {text ? "Refresh" : "Generate"}
          </Button>
        </Tap>
      </CardHeader>
      <CardContent>
        {text ? (
          <p className="text-sm leading-relaxed">{text}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Get a short, friendly recap of your week&apos;s spending.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
