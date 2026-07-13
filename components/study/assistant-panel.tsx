"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import {
  ArrowUp,
  Check,
  Loader2,
  ListTree,
  Sparkles,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { addTopic } from "@/lib/study/actions";
import { createChapter } from "@/lib/study/chapters";
import { createStudyTask } from "@/lib/study/tasks";
import { getAiBudget } from "@/lib/study/assistant-actions";
import type { BudgetStatus } from "@/lib/ai/usage";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tap } from "@/components/motion/tap";

type PlanProposal = {
  summary: string;
  chapters: { name: string; topics: string[] }[];
  tasks: { title: string; dueInDays?: number | null }[];
};

/** yyyy-mm-dd for today + `days`. */
function isoDatePlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function AssistantPanel({
  subjectId,
  subjectName,
}: {
  subjectId: string;
  subjectName: string;
}) {
  const router = useRouter();
  const [budget, setBudget] = React.useState<BudgetStatus | null>(null);
  const [proposal, setProposal] = React.useState<PlanProposal | null>(null);
  const [drafting, setDrafting] = React.useState(false);
  const [applying, setApplying] = React.useState(false);
  const [planError, setPlanError] = React.useState<string | null>(null);

  const refreshBudget = React.useCallback(() => {
    void getAiBudget().then(setBudget);
  }, []);
  React.useEffect(() => refreshBudget(), [refreshBudget]);

  const { messages, input, handleInputChange, handleSubmit, status } = useChat({
    api: "/api/study/assistant",
    body: { subjectId, subjectName },
    onFinish: refreshBudget,
  });
  const busy = status === "submitted" || status === "streaming";
  const scrollRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, proposal]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    handleSubmit(e, { body: { subjectId, subjectName } });
  }

  async function draftPlan() {
    setDrafting(true);
    setPlanError(null);
    setProposal(null);
    try {
      const res = await fetch("/api/study/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId, subjectName, prompt: input }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not draft a plan.");
      setProposal(json.proposal as PlanProposal);
    } catch (e) {
      setPlanError(e instanceof Error ? e.message : "Could not draft a plan.");
    } finally {
      setDrafting(false);
      refreshBudget();
    }
  }

  async function applyPlan() {
    if (!proposal) return;
    setApplying(true);
    for (const ch of proposal.chapters) {
      const res = await createChapter(subjectId, ch.name);
      const chapterId = res.ok ? (res.data?.id ?? null) : null;
      for (const tp of ch.topics) {
        await addTopic(subjectId, tp, chapterId);
      }
    }
    for (const t of proposal.tasks) {
      const due =
        t.dueInDays != null ? isoDatePlus(t.dueInDays) : null;
      await createStudyTask({ subjectId, title: t.title, dueDate: due });
    }
    setApplying(false);
    setProposal(null);
    router.refresh();
  }

  return (
    <Card className="flex h-[70vh] flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Sparkles
              className="h-4 w-4"
              style={{ color: "hsl(var(--module-study))" }}
            />
            Study assistant
          </p>
          <p className="text-xs text-muted-foreground">
            Plan {subjectName} - review and apply changes.
          </p>
        </div>
        {budget && <BudgetPill budget={budget} />}
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && !proposal && (
          <p className="text-sm text-muted-foreground">
            Ask how to structure this subject, or hit{" "}
            <span className="font-medium text-foreground">Draft a plan</span> to
            generate chapters, topics and tasks you can apply in one click.
          </p>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "flex",
              m.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            <div
              className={cn(
                "max-w-[85%] whitespace-pre-wrap rounded-card px-3 py-2 text-sm",
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted",
              )}
            >
              {m.content}
            </div>
          </div>
        ))}

        {proposal && (
          <ProposalCard
            proposal={proposal}
            applying={applying}
            onApply={applyPlan}
            onDismiss={() => setProposal(null)}
          />
        )}

        {planError && <p className="text-xs text-destructive">{planError}</p>}
      </div>

      <div className="space-y-2 border-t p-3">
        <Tap className="inline-flex">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={drafting || applying}
            onClick={draftPlan}
          >
            {drafting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ListTree className="h-4 w-4" />
            )}
            Draft a plan
          </Button>
        </Tap>
        <form onSubmit={onSubmit} className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={handleInputChange}
            placeholder="Ask about planning this subject..."
            rows={1}
            className="min-h-[40px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmit(e);
              }
            }}
          />
          <Button type="submit" size="icon" disabled={busy || !input.trim()}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </Card>
  );
}

function BudgetPill({ budget }: { budget: BudgetStatus }) {
  const pct = Math.round((budget.remaining / budget.limit) * 100);
  const low = pct <= 10;
  return (
    <div className="text-right">
      <p
        className={cn(
          "text-xs font-medium tabular-nums",
          low ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {(budget.remaining / 1000).toFixed(0)}k left
      </p>
      <div className="mt-1 h-1 w-20 overflow-hidden rounded-pill bg-muted">
        <div
          className="h-full rounded-pill"
          style={{
            width: `${pct}%`,
            backgroundColor: low
              ? "hsl(var(--destructive))"
              : "hsl(var(--module-study))",
          }}
        />
      </div>
    </div>
  );
}

function ProposalCard({
  proposal,
  applying,
  onApply,
  onDismiss,
}: {
  proposal: PlanProposal;
  applying: boolean;
  onApply: () => void;
  onDismiss: () => void;
}) {
  const topicCount = proposal.chapters.reduce(
    (n, c) => n + c.topics.length,
    0,
  );
  return (
    <Card className="space-y-3 border-[hsl(var(--module-study)/0.4)] p-3">
      <p className="text-sm">{proposal.summary}</p>
      <p className="text-xs text-muted-foreground">
        {proposal.chapters.length} chapters · {topicCount} topics ·{" "}
        {proposal.tasks.length} tasks
      </p>

      <div className="space-y-2">
        {proposal.chapters.map((c, i) => (
          <div key={i} className="rounded-button border p-2">
            <p className="text-sm font-medium">{c.name}</p>
            {c.topics.length > 0 && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {c.topics.join(" · ")}
              </p>
            )}
          </div>
        ))}
        {proposal.tasks.length > 0 && (
          <div className="rounded-button border p-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tasks
            </p>
            <ul className="mt-1 space-y-0.5">
              {proposal.tasks.map((t, i) => (
                <li key={i} className="text-xs">
                  {t.title}
                  {t.dueInDays != null && (
                    <span className="text-muted-foreground">
                      {" "}
                      · in {t.dueInDays}d
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Tap className="inline-flex">
          <Button size="sm" onClick={onApply} disabled={applying}>
            {applying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Apply to {subjectPluralLabel(proposal)}
          </Button>
        </Tap>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDismiss}
          disabled={applying}
        >
          <X className="h-4 w-4" />
          Dismiss
        </Button>
      </div>
    </Card>
  );
}

function subjectPluralLabel(proposal: PlanProposal): string {
  const n = proposal.chapters.length;
  return `${n} chapter${n === 1 ? "" : "s"}`;
}
