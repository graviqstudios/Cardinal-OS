"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Loader2, Plus, Trash2, Zap } from "lucide-react";

import { addXp, createSkill, deleteSkill } from "@/lib/skills/actions";
import { XP_PER_LEVEL, levelForXp, xpIntoLevel, type Skill } from "@/lib/skills/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tap } from "@/components/motion/tap";

export function SkillTree({ skills }: { skills: Skill[] }) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [area, setArea] = React.useState("");
  const [, start] = React.useTransition();

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const payload = { name, area: area.trim() || null };
    setName(""); setArea("");
    start(async () => {
      await createSkill(payload.name, payload.area);
      router.refresh();
    });
  }

  // Group by area; skills with no area fall under "General".
  const groups = React.useMemo(() => {
    const map = new Map<string, Skill[]>();
    for (const s of skills) {
      const key = s.area_tag?.trim() || "General";
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [skills]);

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4" style={{ color: "hsl(var(--module-goals))" }} />
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Skill tree
          </p>
        </div>

        <form onSubmit={add} className="flex flex-wrap gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Skill (e.g. Python)" className="min-w-[9rem] flex-1 bg-surface" />
          <Input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Area (optional)" className="w-36 bg-surface" />
          <Button type="submit" disabled={!name.trim()}><Plus className="h-4 w-4" />Add</Button>
        </form>

        {skills.length === 0 ? (
          <p className="px-1 text-sm text-muted-foreground">
            No skills yet. Add one, then log practice to earn XP and level it up.
          </p>
        ) : (
          <div className="space-y-5">
            {groups.map(([area, list]) => (
              <div key={area} className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">{area}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {list.map((s) => (
                    <SkillNode key={s.id} skill={s} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SkillNode({ skill }: { skill: Skill }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [busy, setBusy] = React.useState(false);
  const [celebrate, setCelebrate] = React.useState<number | null>(null);

  const level = levelForXp(skill.xp);
  const into = xpIntoLevel(skill.xp);
  const pct = Math.round((into / XP_PER_LEVEL) * 100);

  async function practice() {
    setBusy(true);
    const res = await addXp(skill.id);
    setBusy(false);
    if (res.ok && res.data?.leveledUp) {
      setCelebrate(res.data.level);
      window.setTimeout(() => setCelebrate(null), 1200);
    }
    if (res.ok) router.refresh();
  }

  return (
    <div className="relative flex items-center gap-3 rounded-card border p-3">
      {/* level ring */}
      <div className="relative h-12 w-12 shrink-0">
        <svg width={48} height={48} viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="20" stroke="hsl(var(--muted))" strokeWidth={4} />
          <circle
            cx="24" cy="24" r="20" stroke="hsl(var(--module-goals))" strokeWidth={4} strokeLinecap="round"
            pathLength={100} strokeDasharray={`${pct} 100`} transform="rotate(-90 24 24)"
            style={{ transition: "stroke-dasharray .4s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums">
          {level}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{skill.name}</p>
        <p className="text-xs text-muted-foreground">Level {level} · {into}/{XP_PER_LEVEL} XP</p>
      </div>

      <Tap className="inline-flex">
        <Button size="sm" variant="secondary" onClick={practice} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          +{XP_PER_LEVEL / 4}
        </Button>
      </Tap>
      <button
        onClick={() => start(skill.id)}
        className="text-muted-foreground hover:text-foreground"
        aria-label="Delete skill"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      {/* one-shot level-up flourish */}
      <AnimatePresence>
        {celebrate != null && (
          <motion.div
            className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-card"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.2, 0, 0, 1] }}
            style={{ background: "hsl(var(--module-goals) / 0.14)" }}
          >
            <span className="rounded-pill bg-[hsl(var(--module-goals))] px-3 py-1 text-xs font-semibold text-white">
              Level {celebrate}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  function start(id: string) {
    void deleteSkill(id).then(() => router.refresh());
  }
}
