"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Loader2, MinusCircle, XCircle } from "lucide-react";

import { STATUS_META, type TopicStatus } from "@/lib/study/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tap } from "@/components/motion/tap";

type PracticeTopic = { id: string; name: string; subjectName: string };
type Question = { question: string; answer: string };
type GradeResult = { verdict: "full" | "partial" | "none"; feedback: string };
type Phase = "select" | "loading" | "quiz" | "grading" | "results";

export function PracticeClient({ topics }: { topics: PracticeTopic[] }) {
  const router = useRouter();
  const [phase, setPhase] = React.useState<Phase>("select");
  const [topic, setTopic] = React.useState<PracticeTopic | null>(null);
  const [questions, setQuestions] = React.useState<Question[]>([]);
  const [answers, setAnswers] = React.useState<string[]>([]);
  const [results, setResults] = React.useState<GradeResult[] | null>(null);
  const [score, setScore] = React.useState<{ earned: number; total: number; status: TopicStatus } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Group topics under their subject, preserving order.
  const grouped = React.useMemo(() => {
    const map = new Map<string, PracticeTopic[]>();
    for (const t of topics) {
      const arr = map.get(t.subjectName) ?? [];
      arr.push(t);
      map.set(t.subjectName, arr);
    }
    return [...map.entries()];
  }, [topics]);

  async function startQuiz(t: PracticeTopic) {
    setTopic(t);
    setError(null);
    setPhase("loading");
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicName: t.name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to generate quiz.");
      setQuestions(json.questions);
      setAnswers(new Array(json.questions.length).fill(""));
      setPhase("quiz");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate quiz.");
      setPhase("select");
    }
  }

  async function submit() {
    if (!topic) return;
    setPhase("grading");
    setError(null);
    try {
      const items = questions.map((q, i) => ({
        question: q.question,
        reference: q.answer,
        userAnswer: answers[i] ?? "",
      }));
      const res = await fetch("/api/quiz/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId: topic.id, topicName: topic.name, items }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Grading failed.");
      setResults(json.results);
      setScore({ earned: json.score, total: json.total, status: json.status });
      setPhase("results");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Grading failed.");
      setPhase("quiz");
    }
  }

  function reset() {
    setPhase("select");
    setTopic(null);
    setQuestions([]);
    setAnswers([]);
    setResults(null);
    setScore(null);
  }

  if (phase === "select" || phase === "loading") {
    return (
      <div className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {topics.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              No topics yet. Add subjects and topics in{" "}
              <Link href="/study" className="font-medium text-primary hover:underline">
                Study
              </Link>{" "}
              first.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="space-y-5 p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Pick a topic to quiz yourself on
              </p>
              {grouped.map(([subjectName, subjectTopics]) => (
                <div key={subjectName} className="space-y-1.5">
                  <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {subjectName}
                  </p>
                  {subjectTopics.map((t) => (
                    <Tap key={t.id} className="block">
                      <button
                        onClick={() => startQuiz(t)}
                        disabled={phase === "loading"}
                        className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent disabled:opacity-60"
                      >
                        <span className="flex-1 text-sm font-medium">{t.name}</span>
                        {phase === "loading" && topic?.id === t.id && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                      </button>
                    </Tap>
                  ))}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (phase === "results" && results && score) {
    const pct = Math.round((score.earned / score.total) * 100);
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="text-3xl font-semibold">{pct}%</div>
            <div className="flex-1">
              <p className="text-sm font-medium">
                {score.earned} / {score.total} on {topic?.name}
              </p>
              <p className="text-sm text-muted-foreground">
                Topic marked{" "}
                <span style={{ color: `hsl(var(${STATUS_META[score.status].varName}))` }}>
                  {STATUS_META[score.status].label}
                </span>
                .
              </p>
            </div>
            <Tap className="inline-flex">
              <Button onClick={reset}>Practice another</Button>
            </Tap>
          </CardContent>
        </Card>

        {questions.map((q, i) => {
          const r = results[i];
          return (
            <Card key={i}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start gap-2">
                  <VerdictIcon verdict={r.verdict} />
                  <p className="flex-1 text-sm font-medium">{q.question}</p>
                </div>
                <p className="pl-6 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Your answer: </span>
                  {answers[i] || "-"}
                </p>
                <p className="pl-6 text-sm text-muted-foreground">{r.feedback}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  // quiz / grading
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Quiz on <span className="font-medium text-foreground">{topic?.name}</span>
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {questions.map((q, i) => (
        <Card key={i}>
          <CardContent className="space-y-2 p-4">
            <p className="text-sm font-medium">
              {i + 1}. {q.question}
            </p>
            <Textarea
              value={answers[i]}
              onChange={(e) => {
                const next = [...answers];
                next[i] = e.target.value;
                setAnswers(next);
              }}
              placeholder="Your answer…"
              rows={2}
            />
          </CardContent>
        </Card>
      ))}
      <div className="flex justify-end gap-2">
        <Tap className="inline-flex">
          <Button variant="ghost" onClick={reset} disabled={phase === "grading"}>
            Cancel
          </Button>
        </Tap>
        <Tap className="inline-flex">
          <Button onClick={submit} disabled={phase === "grading"}>
            {phase === "grading" && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit for grading
          </Button>
        </Tap>
      </div>
    </div>
  );
}

function VerdictIcon({ verdict }: { verdict: GradeResult["verdict"] }) {
  if (verdict === "full")
    return <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "hsl(var(--status-strong))" }} />;
  if (verdict === "partial")
    return <MinusCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "hsl(var(--status-moderate))" }} />;
  if (verdict === "none")
    return <XCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "hsl(var(--status-untouched))" }} />;
  return <Circle className="mt-0.5 h-4 w-4 shrink-0" />;
}
