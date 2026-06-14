"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Mic, MicOff, Volume2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { STATUS_META, type TopicStatus } from "@/lib/study/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tap } from "@/components/motion/tap";

type VoiceTopic = { id: string; name: string; subjectName: string };
type Question = { question: string; answer: string };
type GradeResult = { verdict: "full" | "partial" | "none"; feedback: string };
type Phase = "select" | "loading" | "active" | "grading" | "results";

/* eslint-disable @typescript-eslint/no-explicit-any */
function makeRecognition(): any | null {
  if (typeof window === "undefined") return null;
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) return null;
  const r = new SR();
  r.lang = "en-US";
  r.interimResults = true;
  r.continuous = true;
  return r;
}

export function VoiceExaminer({ topics }: { topics: VoiceTopic[] }) {
  const router = useRouter();
  const [supported, setSupported] = React.useState(true);
  const [phase, setPhase] = React.useState<Phase>("select");
  const [topic, setTopic] = React.useState<VoiceTopic | null>(null);
  const [questions, setQuestions] = React.useState<Question[]>([]);
  const [idx, setIdx] = React.useState(0);
  const [answers, setAnswers] = React.useState<string[]>([]);
  const [listening, setListening] = React.useState(false);
  const [results, setResults] = React.useState<GradeResult[] | null>(null);
  const [score, setScore] = React.useState<{ earned: number; total: number; status: TopicStatus } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [browserWarning, setBrowserWarning] = React.useState<string | null>(null);

  const recognitionRef = React.useRef<any>(null);
  const wantListenRef = React.useRef(false); // user intends to keep listening
  const idxRef = React.useRef(0); // current question (stable for handlers)
  const finalRef = React.useRef(""); // accumulated final transcript

  React.useEffect(() => {
    idxRef.current = idx;
  }, [idx]);

  React.useEffect(() => {
    setSupported(makeRecognition() !== null && "speechSynthesis" in window);
    // Brave ships SpeechRecognition but disables the speech-to-text backend, so
    // audio is captured but no transcript ever returns. Warn and point to Chrome.
    const nav = navigator as any;
    if (nav.brave?.isBrave) {
      nav.brave
        .isBrave()
        .then((isBrave: boolean) => {
          if (isBrave)
            setBrowserWarning(
              "Brave blocks speech-to-text, so spoken answers won't transcribe. Open Cardinal OS in Microsoft Edge or Google Chrome for the voice examiner.",
            );
        })
        .catch(() => {});
    }
    return () => {
      wantListenRef.current = false;
      try { recognitionRef.current?.stop(); } catch {}
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, []);

  const grouped = React.useMemo(() => {
    const m = new Map<string, VoiceTopic[]>();
    for (const t of topics) {
      const arr = m.get(t.subjectName) ?? [];
      arr.push(t);
      m.set(t.subjectName, arr);
    }
    return [...m.entries()];
  }, [topics]);

  function speak(text: string) {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    window.speechSynthesis.speak(u);
  }

  function ensureRecognition() {
    if (recognitionRef.current) return recognitionRef.current;
    const r = makeRecognition();
    if (!r) return null;

    r.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const tr = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalRef.current += tr + " ";
        else interim += tr;
      }
      const text = (finalRef.current + interim).trim();
      setAnswers((prev) => {
        const next = [...prev];
        next[idxRef.current] = text;
        return next;
      });
    };

    r.onerror = (e: any) => {
      if (e.error === "not-allowed") {
        wantListenRef.current = false;
        setListening(false);
        setError("Microphone access is blocked. Allow it in your browser and try again.");
      } else if (e.error === "network" || e.error === "service-not-allowed") {
        // The speech backend is unavailable (typical in Brave / privacy browsers).
        wantListenRef.current = false;
        setListening(false);
        setBrowserWarning(
          "Your browser is blocking the speech-to-text service. Open Cardinal OS in Microsoft Edge or Google Chrome to use the voice examiner.",
        );
      }
      // 'no-speech' / 'aborted' → let onend decide whether to restart.
    };

    r.onend = () => {
      // Chrome ends recognition after pauses; restart while the user still wants it.
      if (wantListenRef.current) {
        try { r.start(); } catch { /* will retry on next onend */ }
      } else {
        setListening(false);
      }
    };

    recognitionRef.current = r;
    return r;
  }

  function startListening() {
    setError(null);
    window.speechSynthesis?.cancel(); // don't let TTS bleed into the mic
    const r = ensureRecognition();
    if (!r) return;
    // Keep any words already captured for this question, then append.
    finalRef.current = answers[idxRef.current] ? answers[idxRef.current] + " " : "";
    wantListenRef.current = true;
    try {
      r.start();
      setListening(true);
    } catch {
      // Already started — that's fine, we're listening.
      setListening(true);
    }
  }

  function stopListening() {
    wantListenRef.current = false;
    try { recognitionRef.current?.stop(); } catch {}
    setListening(false);
  }

  function toggleListening() {
    if (listening) stopListening();
    else startListening();
  }

  async function startSession(t: VoiceTopic) {
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
      if (!res.ok) throw new Error(json.error ?? "Failed to start.");
      setQuestions(json.questions);
      setAnswers(new Array(json.questions.length).fill(""));
      setIdx(0);
      idxRef.current = 0;
      setPhase("active");
      setTimeout(() => speak(json.questions[0].question), 300);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start.");
      setPhase("select");
    }
  }

  function next() {
    stopListening();
    if (idx < questions.length - 1) {
      const n = idx + 1;
      setIdx(n);
      idxRef.current = n;
      finalRef.current = "";
      setTimeout(() => speak(questions[n].question), 250);
    } else {
      void submit();
    }
  }

  async function submit() {
    if (!topic) return;
    stopListening();
    window.speechSynthesis?.cancel();
    setPhase("grading");
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
      setPhase("active");
    }
  }

  function reset() {
    stopListening();
    window.speechSynthesis?.cancel();
    setPhase("select"); setTopic(null); setQuestions([]); setAnswers([]); setResults(null); setScore(null); setIdx(0);
    idxRef.current = 0; finalRef.current = "";
  }

  if (!supported) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Voice isn&apos;t supported in this browser. Open Cardinal OS in <span className="font-medium text-foreground">Microsoft Edge</span> or <span className="font-medium text-foreground">Chrome</span> to use the voice examiner.
        </CardContent>
      </Card>
    );
  }

  if (phase === "select" || phase === "loading") {
    return (
      <div className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {browserWarning && (
          <div className="rounded-lg border border-dashed bg-muted/40 px-4 py-2.5 text-sm text-muted-foreground">
            {browserWarning}
          </div>
        )}
        {topics.length === 0 ? (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">Add topics in Study first.</CardContent></Card>
        ) : (
          <Card>
            <CardContent className="space-y-5 p-4">
              <p className="text-sm font-medium text-muted-foreground">Pick a topic to be quizzed aloud</p>
              {grouped.map(([subjectName, subjectTopics]) => (
                <div key={subjectName} className="space-y-1.5">
                  <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{subjectName}</p>
                  {subjectTopics.map((t) => (
                    <Tap key={t.id} className="block">
                      <button
                        onClick={() => startSession(t)}
                        disabled={phase === "loading"}
                        className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent disabled:opacity-60"
                      >
                        <Mic className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 text-sm font-medium">{t.name}</span>
                        {phase === "loading" && topic?.id === t.id && <Loader2 className="h-4 w-4 animate-spin" />}
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
              <p className="text-sm font-medium">{score.earned} / {score.total} on {topic?.name}</p>
              <p className="text-sm text-muted-foreground">
                Marked <span style={{ color: `hsl(var(${STATUS_META[score.status].varName}))` }}>{STATUS_META[score.status].label}</span>.
              </p>
            </div>
            <Tap className="inline-flex"><Button onClick={reset}>Another topic</Button></Tap>
          </CardContent>
        </Card>
        {questions.map((q, i) => (
          <Card key={i}>
            <CardContent className="space-y-1 p-4">
              <p className="text-sm font-medium">{q.question}</p>
              <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">You said:</span> {answers[i] || "—"}</p>
              <p className="text-sm text-muted-foreground">{results[i].feedback}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // active / grading
  const q = questions[idx];
  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {browserWarning && (
        <div className="rounded-lg border border-dashed bg-muted/40 px-4 py-2.5 text-sm text-muted-foreground">
          {browserWarning}
        </div>
      )}
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Question {idx + 1} of {questions.length}
            </span>
            <button
              onClick={() => { stopListening(); speak(q.question); }}
              className="inline-flex items-center gap-1 text-xs text-primary"
            >
              <Volume2 className="h-3.5 w-3.5" /> Replay
            </button>
          </div>
          <p className="text-lg font-medium">{q.question}</p>

          <div className="flex flex-col items-center gap-3 py-4">
            <Tap className="inline-flex">
              <button
                onClick={toggleListening}
                className={cn(
                  "flex h-16 w-16 items-center justify-center rounded-full text-primary-foreground transition-colors",
                  listening ? "animate-pulse bg-destructive" : "bg-primary",
                )}
                aria-label={listening ? "Stop recording" : "Start recording"}
              >
                {listening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </button>
            </Tap>
            <p className="text-xs text-muted-foreground">
              {listening ? "Listening… tap to stop" : "Tap the mic and answer aloud"}
            </p>
          </div>

          <div className="min-h-[48px] rounded-lg border bg-muted/30 p-3 text-sm">
            {answers[idx] || <span className="text-muted-foreground">Your spoken answer will appear here…</span>}
          </div>

          <div className="flex justify-end gap-2">
            <Tap className="inline-flex"><Button variant="ghost" onClick={reset} disabled={phase === "grading"}>Cancel</Button></Tap>
            <Tap className="inline-flex">
              <Button onClick={next} disabled={phase === "grading"}>
                {phase === "grading" && <Loader2 className="h-4 w-4 animate-spin" />}
                {idx < questions.length - 1 ? "Next question" : (
                  <>{phase !== "grading" && <Check className="h-4 w-4" />}Finish</>
                )}
              </Button>
            </Tap>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
