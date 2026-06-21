/* eslint-disable react/no-unescaped-entities */
"use client";

import * as React from "react";

/* ────────────────────────────────────────────────────────────────────────────
   Cardinal OS marketing landing. Self-contained dark palette (independent of the
   app theme), accent switcher, scroll-aware nav, reveal-on-scroll, animated Life
   Score ring, FAQ accordion, and legal modals. Fully responsive.
   ──────────────────────────────────────────────────────────────────────────── */

const EMAIL = "graviqstudios" + "@" + "gmail.com";
const EASE = "cubic-bezier(0.2,0,0,1)";

type Accent = { id: string; label: string; color: string; deep: string; rgb: string };
const ACCENTS: Accent[] = [
  { id: "cardinal", label: "Cardinal", color: "#CB4B33", deep: "#B84026", rgb: "203,75,51" },
  { id: "ochre", label: "Ochre", color: "#B57A1E", deep: "#9A6516", rgb: "181,122,30" },
  { id: "pine", label: "Pine", color: "#2F7D5B", deep: "#266A4C", rgb: "47,125,91" },
  { id: "cobalt", label: "Cobalt", color: "#2D5FB0", deep: "#244E96", rgb: "45,95,176" },
  { id: "plum", label: "Plum", color: "#7A4C8F", deep: "#653A78", rgb: "122,76,143" },
];

const NAV = [
  { href: "#lifescore", label: "Life Score" },
  { href: "#features", label: "Features" },
  { href: "#intelligence", label: "Intelligence" },
  { href: "#constellations", label: "Constellations" },
  { href: "#faq", label: "FAQ" },
];

const Arrow = ({ s = 17 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
const Check = ({ s = 15, c = "#7FC4A3" }: { s?: number; c?: string }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
);
const Needle = ({ s = 30 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 100 100" fill="none"><path d="M50 6 L61 53 L39 53 Z" fill="var(--co-accent)" /><path d="M50 86 L61 53 L39 53 Z" fill="#C9BBA3" /></svg>
);

/* ── Reveal-on-scroll wrapper ─────────────────────────────────────────────── */
function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [shown, setShown] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }),
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : "translateY(18px)",
        transition: `opacity .7s ${EASE} ${delay}ms, transform .7s ${EASE} ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ── Animated Life Score ring ─────────────────────────────────────────────── */
function LifeRing({ target, size, stroke }: { target: number; size: number; stroke: number }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [val, setVal] = React.useState(0);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let started = false;
    const run = () => {
      if (started) return;
      started = true;
      if (reduce) { setVal(target); return; }
      const dur = 1500;
      const t0 = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / dur);
        setVal(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) run(); }),
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => { io.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, [target]);

  return (
    <div ref={ref} className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 140 140" fill="none">
        <circle cx="70" cy="70" r="60" stroke="rgba(242,233,219,0.10)" strokeWidth={stroke} />
        <circle
          cx="70" cy="70" r="60" stroke="var(--co-accent)" strokeWidth={stroke} strokeLinecap="round"
          pathLength={1000} strokeDasharray={`${val.toFixed(1)} 1000`} transform="rotate(-90 70 70)"
          style={{ filter: "drop-shadow(0 0 10px rgba(var(--co-accent-rgb),0.4))" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-serif leading-none tabular-nums" style={{ fontSize: size * 0.3 }}>{Math.round(val)}</div>
        <div className="mt-1 text-xs text-[#897C68]">of 1000</div>
      </div>
    </div>
  );
}

export function LandingPage() {
  const [accent, setAccent] = React.useState<Accent>(ACCENTS[0]);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const [showTop, setShowTop] = React.useState(false);
  const [active, setActive] = React.useState("");
  const [modal, setModal] = React.useState<null | "privacy" | "terms" | "support">(null);

  // Restore saved accent.
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("coAccent");
      const found = ACCENTS.find((a) => a.id === saved);
      if (found) setAccent(found);
    } catch { /* ignore */ }
  }, []);

  function pickAccent(a: Accent) {
    setAccent(a);
    try { localStorage.setItem("coAccent", a.id); } catch { /* ignore */ }
  }

  // Scroll state: nav background, to-top button, active section.
  React.useEffect(() => {
    const ids = ["lifescore", "features", "intelligence", "constellations", "faq"];
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      setShowTop(y > 700);
      let cur = "";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 130) cur = id;
      }
      setActive(cur);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock scroll + ESC close for modals.
  React.useEffect(() => {
    if (!modal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setModal(null); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [modal]);

  const accentVars = {
    "--co-accent": accent.color,
    "--co-accent-deep": accent.deep,
    "--co-accent-rgb": accent.rgb,
  } as React.CSSProperties;

  return (
    <div style={accentVars} className="min-h-dvh overflow-x-hidden bg-[#14100B] font-sans text-[#F2E9DB] antialiased">
      {/* ══ NAV ══ */}
      <nav
        className="fixed inset-x-0 top-0 z-[100] border-b transition-colors duration-300"
        style={{
          background: scrolled ? "rgba(18,13,9,0.85)" : "transparent",
          borderBottomColor: scrolled ? "rgba(242,233,219,0.09)" : "transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(12px)" : "none",
        }}
      >
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-5 py-4 sm:px-7">
          <a href="#top" className="flex items-center gap-2.5">
            <Needle s={28} />
            <span className="font-serif text-2xl tracking-tight sm:text-[26px]">Cardinal</span>
            <span className="pt-1 text-[13px] font-semibold tracking-[0.18em] text-[#897C68]">OS</span>
          </a>

          <div className="hidden items-center gap-7 text-sm text-[#B6A892] lg:flex">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="transition-colors hover:text-[var(--co-accent)]"
                style={{ color: active === n.href.slice(1) ? "var(--co-accent)" : undefined }}
              >
                {n.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3.5">
            <div className="hidden items-center gap-1.5 pr-1 lg:flex">
              {ACCENTS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => pickAccent(a)}
                  title={a.label}
                  aria-label={a.label}
                  className="h-4 w-4 rounded-full p-0"
                  style={{ background: a.color, border: `2px solid ${accent.id === a.id ? "#F2E9DB" : "transparent"}` }}
                />
              ))}
            </div>
            <a href="/login" className="hidden text-sm text-[#EFE6D6] transition-colors hover:text-[var(--co-accent)] sm:inline-block">Log in</a>
            <a
              href="/signup"
              className="rounded-[10px] px-4 py-2.5 text-sm font-medium text-white transition-transform active:scale-95"
              style={{ background: "var(--co-accent)" }}
            >
              Sign up
            </a>
            <button
              aria-label="Menu"
              onClick={() => setMenuOpen((o) => !o)}
              className="p-1.5 text-[#F2E9DB] lg:hidden"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="flex flex-col gap-0.5 border-t border-[rgba(242,233,219,0.08)] bg-[rgba(18,13,9,0.97)] px-5 pb-4 pt-2 lg:hidden">
            {[...NAV, { href: "#about", label: "About" }, { href: "#reviews", label: "Reviews" }].map((n) => (
              <a key={n.href} href={n.href} onClick={() => setMenuOpen(false)} className="border-b border-[rgba(242,233,219,0.05)] px-2 py-3 text-[15px] text-[#D7CCBA] last:border-0">
                {n.label}
              </a>
            ))}
            <a href="/login" className="px-2 py-3 text-[15px] text-[#D7CCBA]">Log in</a>
          </div>
        )}
      </nav>

      {/* ══ HERO ══ */}
      <header id="top" className="relative px-5 pb-24 pt-32 sm:px-7 sm:pt-40">
        <div
          className="pointer-events-none absolute left-1/2 top-20 h-[520px] w-[760px] max-w-[90vw] -translate-x-1/2 blur-lg"
          style={{ background: "radial-gradient(ellipse at center, rgba(var(--co-accent-rgb),0.16), transparent 68%)" }}
        />
        <div className="relative mx-auto grid max-w-[1180px] items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="inline-flex items-center gap-2.5 rounded-full border border-[rgba(242,233,219,0.14)] px-3.5 py-1.5 text-[13px] text-[#C9BBA3]">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--co-accent)" }} />
              One compass for everything
            </div>
            <h1 className="mt-6 font-serif text-5xl font-normal leading-[1.02] tracking-[-0.015em] sm:text-6xl lg:text-[74px]">
              The operating system for your <span className="italic" style={{ color: "var(--co-accent)" }}>life</span>.
            </h1>
            <p className="mt-6 max-w-[540px] text-[17px] leading-relaxed text-[#B6A892] sm:text-[19px]">
              One calm, premium home for your days, habits, goals, money, body and mind, with AI woven through everything and one honest number to orient by.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="/signup" className="inline-flex items-center gap-2.5 rounded-xl px-6 py-3.5 text-[15px] font-medium text-white transition-transform active:scale-[0.97]" style={{ background: "var(--co-accent)" }}>
                Start free <Arrow />
              </a>
              <a href="#features" className="inline-flex items-center gap-2.5 rounded-xl border border-[rgba(242,233,219,0.14)] bg-[#241C15] px-6 py-3.5 text-[15px] font-medium text-[#EFE6D6] transition-colors hover:bg-[#2C2219]">
                Explore features
              </a>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-5 text-[13px] text-[#897C68]">
              <span className="inline-flex items-center gap-2"><Check /> Free during beta</span>
              <span className="inline-flex items-center gap-2"><Check /> No card, no catch</span>
            </div>
          </div>

          {/* hero ring card */}
          <div className="rounded-[24px] border border-[rgba(242,233,219,0.10)] p-8 shadow-[0_30px_70px_rgba(0,0,0,0.45)]" style={{ background: "linear-gradient(160deg,#221A12,#1A140F)" }}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#C97A63]">Life Score</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(47,125,91,0.3)] bg-[rgba(47,125,91,0.16)] px-2.5 py-1 text-xs font-medium text-[#7FC4A3]">▲ up 12 today</span>
            </div>
            <div className="flex justify-center pb-1.5 pt-3.5">
              <LifeRing target={784} size={190} stroke={9} />
            </div>
            <div className="mt-1.5 flex h-[38px] items-end gap-1">
              {[40, 55, 48, 68, 60, 78, 72, 90].map((h, i) => (
                <div key={i} className="flex-1 rounded-[3px]" style={{ height: `${h}%`, background: i === 7 ? "var(--co-accent)" : `rgba(var(--co-accent-rgb),${0.25 + i * 0.03})` }} />
              ))}
            </div>
            <div className="mt-2.5 text-center text-xs text-[#897C68]">14-day trend</div>
          </div>
        </div>
      </header>

      {/* ══ LIFE SCORE ══ */}
      <section id="lifescore" className="scroll-mt-[84px] px-5 py-20 sm:px-7">
        <div className="mx-auto max-w-[1180px]">
          <div className="grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr]">
            <Reveal>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C97A63]">The one number</div>
              <h2 className="mt-3.5 font-serif text-4xl font-normal leading-[1.05] tracking-[-0.01em] sm:text-[46px]">One honest number, every morning.</h2>
              <p className="mt-5 text-[17px] leading-relaxed text-[#B6A892]">
                Your Life Score folds your whole life into a single figure from 0 to 1000. The first thing you check, the thing you orient around. It rewards balance, not grinding, and it never punishes a single off day.
              </p>
              <div className="mt-6 flex flex-col gap-3.5">
                {[["Habits", 30], ["Goal velocity", 30], ["Task follow-through", 25], ["Life balance", 15]].map(([label, pct]) => (
                  <div key={label as string} className="flex items-center gap-3.5">
                    <div className="w-24 shrink-0 text-[13px] text-[#D7CCBA]">{label}</div>
                    <div className="h-2 flex-1 overflow-hidden rounded-[4px] bg-[rgba(242,233,219,0.08)]">
                      <div className="h-full rounded-[4px]" style={{ width: `${pct}%`, background: "var(--co-accent)" }} />
                    </div>
                    <div className="w-9 text-right text-xs text-[#897C68]">{pct}%</div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex items-start gap-3 rounded-[14px] border p-4" style={{ background: "rgba(var(--co-accent-rgb),0.08)", borderColor: "rgba(var(--co-accent-rgb),0.18)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--co-accent)" strokeWidth="1.8" className="mt-0.5 shrink-0"><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" strokeLinecap="round" /></svg>
                <p className="text-sm leading-relaxed text-[#D7CCBA]">Anti-anxiety by design. The ring never shows red. A 300 wears the same calm color as an 800, and one missed day cannot collapse it.</p>
              </div>
            </Reveal>
            <Reveal className="flex flex-col items-center rounded-[24px] border border-[rgba(242,233,219,0.10)] bg-[#1A140F] p-8 sm:p-11">
              <LifeRing target={784} size={220} stroke={8} />
              <p className="mx-auto mt-7 max-w-[340px] text-center font-serif text-xl italic leading-relaxed text-[#D7CCBA]">
                “Your week is tracking well. Body shows four solid days. Rohan hasn't heard from you in three weeks, worth a message.”
              </p>
              <div className="mt-3.5 text-xs text-[#897C68]">Today's AI briefing</div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══ FEATURES / LIFE AREAS ══ */}
      <section id="features" className="scroll-mt-[84px] px-5 py-20 sm:px-7">
        <div className="mx-auto max-w-[1180px]">
          <Reveal className="mx-auto max-w-[640px] text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C97A63]">Life areas</div>
            <h2 className="mt-3.5 font-serif text-4xl font-normal leading-[1.05] tracking-[-0.01em] sm:text-[46px]">Eleven areas. One system.</h2>
            <p className="mt-4 text-[17px] leading-relaxed text-[#B6A892]">Every part of a life in motion, in one calm interface. Each area carries its own mark and color, so a glance tells you where you are.</p>
          </Reveal>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {AREAS.map((a, i) => (
              <Reveal key={a.name} delay={(i % 3) * 60}>
                <div
                  className="group h-full rounded-[18px] border border-[rgba(242,233,219,0.09)] bg-[#1A140F] p-6 transition-transform duration-200 hover:-translate-y-1"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-[13px]" style={{ background: a.tint }}>{a.icon}</div>
                  <h3 className="mt-4 flex items-center gap-2 text-lg font-semibold">
                    {a.name}
                    {a.soon && <SoonTag />}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#9C8E78]">{a.desc}</p>
                </div>
              </Reveal>
            ))}
            <Reveal delay={120}>
              <a href="/signup" className="flex h-full flex-col justify-between rounded-[18px] border p-6 transition-transform duration-200 hover:-translate-y-1" style={{ background: "linear-gradient(160deg, rgba(var(--co-accent-rgb),0.16), rgba(var(--co-accent-rgb),0.04))", borderColor: "rgba(var(--co-accent-rgb),0.28)" }}>
                <div className="flex h-12 w-12 items-center justify-center rounded-[13px]" style={{ background: "rgba(var(--co-accent-rgb),0.2)", color: "var(--co-accent)" }}><Arrow s={26} /></div>
                <div>
                  <h3 className="mt-4 text-lg font-semibold">Templates &amp; more</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#C9BBA3]">Install life packs: Exam Prep today, with Fitness, Job Hunt and Creator rolling out.</p>
                </div>
              </a>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══ DIFFERENCE (parchment band) ══ */}
      <section className="bg-[#F4EFE5] px-5 py-24 text-[#221C14] sm:px-7">
        <div className="mx-auto max-w-[1080px]">
          <Reveal className="mx-auto max-w-[720px] text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--co-accent)" }}>Not a template. A system.</div>
            <h2 className="mt-4 font-serif text-4xl font-normal leading-[1.08] tracking-[-0.01em] sm:text-5xl">One system that sees your whole life.</h2>
            <p className="mt-5 text-[17px] leading-relaxed text-[#6E6458]">
              A Notion template is a document you maintain. Cardinal is a system that runs itself. Your habits, money, sleep, goals and people usually live in separate places that never speak to each other. Cardinal brings them together and notices how they move as one, surfacing the patterns that only appear when everything finally shares the same home.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {[
              "You skip workouts when exam stress peaks.",
              "Your spending spikes when your sleep drops.",
              "Task follow-through is higher on days you log sleep.",
            ].map((line, i) => (
              <Reveal key={i} delay={i * 80}>
                <div className="rounded-[18px] border border-black/[0.07] bg-[#FFFDF8] p-7">
                  <div className="font-serif text-[13px] italic" style={{ color: "var(--co-accent)" }}>we noticed</div>
                  <p className="mt-2.5 font-serif text-2xl leading-[1.35] text-[#221C14]">{line}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ TODAY MOCKUP ══ */}
      <section className="px-5 py-24 sm:px-7">
        <div className="mx-auto grid max-w-[1180px] items-center gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <Reveal>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C97A63]">The command centre</div>
            <h2 className="mt-3.5 font-serif text-4xl font-normal leading-[1.05] tracking-[-0.01em] sm:text-[46px]">Your whole morning, in one screen.</h2>
            <p className="mt-5 text-[17px] leading-relaxed text-[#B6A892]">
              Today opens to your score, your intention, your habits, your tasks, the next thing on your calendar, and a short briefing that already knows what matters. Quick-capture anything in under five seconds.
            </p>
            <div className="mt-6 flex flex-col gap-3.5">
              {["AI plans your day and writes your weekly review", "Captures anything you type in plain words and files it", "Notices the patterns that run across your whole life"].map((t) => (
                <div key={t} className="flex items-center gap-3 text-[15px] text-[#D7CCBA]"><span className="h-2 w-2 rounded-full" style={{ background: "var(--co-accent)" }} />{t}</div>
              ))}
            </div>
          </Reveal>

          <Reveal className="rounded-[22px] border border-black/[0.06] bg-[#F5EFE3] p-5 text-[#221C14] shadow-[0_40px_90px_rgba(0,0,0,0.5)] sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-serif text-xl">Good morning, Alex.</div>
                <div className="mt-0.5 text-xs text-[#8A7E6A]">Thursday</div>
              </div>
              <div className="relative h-[54px] w-[54px]">
                <svg width="54" height="54" viewBox="0 0 140 140" fill="none"><circle cx="70" cy="70" r="60" stroke="rgba(0,0,0,0.08)" strokeWidth="12" /><circle cx="70" cy="70" r="60" stroke="var(--co-accent)" strokeWidth="12" strokeLinecap="round" pathLength={1000} strokeDasharray="784 1000" transform="rotate(-90 70 70)" /></svg>
                <div className="absolute inset-0 flex items-center justify-center font-serif text-[17px] tabular-nums">784</div>
              </div>
            </div>
            <div className="mt-4 rounded-[13px] border border-black/[0.06] bg-[#FFFCF5] px-4 py-3 text-[13px] text-[#6E6458]">What matters most today? <span className="text-[#B7AE9E]">Type an intention…</span></div>
            <div className="mt-3.5">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8A7E6A]">Today's habits</div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-[9px] border border-[rgba(47,125,91,0.25)] bg-[rgba(47,125,91,0.12)] px-2.5 py-1.5 text-[13px] font-medium text-[#2F7D5B]"><span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#2F7D5B]"><Check s={9} c="#fff" /></span>Cold shower</span>
                {["Read", "Walk"].map((h) => (<span key={h} className="inline-flex items-center gap-1.5 rounded-[9px] border border-black/[0.08] bg-[#FFFCF5] px-2.5 py-1.5 text-[13px] text-[#6E6458]"><span className="h-3.5 w-3.5 rounded-full border-[1.5px] border-[#C2BAA8]" />{h}</span>))}
              </div>
            </div>
            <div className="mt-4">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8A7E6A]">Today's tasks</div>
              <div className="rounded-[13px] border border-black/[0.06] bg-[#FFFCF5] px-1 py-1.5">
                {["Call Anuj at 5pm", "Review ServiQ billing logic"].map((t, i) => (
                  <div key={t} className={`flex items-center gap-2.5 px-3 py-2 text-sm text-[#221C14] ${i ? "border-t border-black/[0.05]" : ""}`}><span className="h-[15px] w-[15px] rounded-[5px] border-[1.5px] border-[#C2BAA8]" />{t}</div>
                ))}
              </div>
            </div>
            <div className="mt-3.5 flex items-center gap-2.5 rounded-[13px] border px-4 py-3" style={{ background: "rgba(var(--co-accent-rgb),0.08)", borderColor: "rgba(var(--co-accent-rgb),0.18)" }}>
              <Needle s={18} />
              <div className="text-[13px] leading-snug text-[#5E564A]">Your week is tracking well. Body shows four solid days.</div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ INTELLIGENCE (new) ══ */}
      <section id="intelligence" className="scroll-mt-[84px] bg-[#100B07] px-5 py-24 sm:px-7">
        <div className="mx-auto max-w-[1180px]">
          <Reveal className="mx-auto max-w-[660px] text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C97A63]">Intelligence</div>
            <h2 className="mt-3.5 font-serif text-4xl font-normal leading-[1.05] tracking-[-0.01em] sm:text-[46px]">An operating partner, not a database.</h2>
            <p className="mt-4 text-[17px] leading-relaxed text-[#B6A892]">A document cannot reason across your life. Cardinal can. AI is woven through every corner, quietly doing the work you would never get around to.</p>
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {AI_FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 60}>
                <div className="h-full rounded-[18px] border border-[rgba(242,233,219,0.09)] bg-[#1A140F] p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[11px]" style={{ background: "rgba(var(--co-accent-rgb),0.14)", color: "var(--co-accent)" }}>{f.icon}</div>
                  <h3 className="mt-4 flex items-center gap-2 text-base font-semibold">{f.title}{f.soon && <SoonTag />}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#9C8E78]">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ JOURNAL (new beat) ══ */}
      <section className="px-5 py-24 sm:px-7">
        <div className="mx-auto grid max-w-[1180px] items-center gap-12 lg:grid-cols-[1fr_1fr]">
          <Reveal>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C97A63]">Journal &amp; second brain</div>
            <h2 className="mt-3.5 font-serif text-4xl font-normal leading-[1.05] tracking-[-0.01em] sm:text-[46px]">A mind that remembers, so you don't have to.</h2>
            <p className="mt-5 text-[17px] leading-relaxed text-[#B6A892]">
              Write daily, weekly or whenever. Every entry is quietly embedded, so months later you can ask your own notes a question and get a grounded answer. On Sundays, Cardinal writes you a letter about your week, the kind you want to keep.
            </p>
            <div className="mt-6 flex flex-col gap-3.5">
              {["Daily reflections with a one-tap mood check", "Ask your notes anything, answered from what you wrote", "A Sunday review written to be re-read, not a chart"].map((t) => (
                <div key={t} className="flex items-start gap-3 text-[15px] text-[#D7CCBA]"><span className="mt-2 h-2 w-2 shrink-0 rounded-full" style={{ background: "var(--co-accent)" }} />{t}</div>
              ))}
            </div>
          </Reveal>
          <Reveal className="rounded-[22px] border border-[rgba(242,233,219,0.10)] bg-[#1A140F] p-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#897C68]">Ask your notes</div>
            <div className="mt-3 flex flex-col gap-2.5">
              <div className="self-end rounded-2xl rounded-tr-[4px] px-3.5 py-2 text-sm text-white" style={{ background: "var(--co-accent)" }}>When did I feel most at ease last month?</div>
              <div className="self-start rounded-2xl rounded-tl-[4px] bg-[#241C15] px-3.5 py-2 text-sm text-[#D7CCBA]">The weekend you spent off-grid in Wayanad, and the three mornings you ran before work. Both followed nights you logged seven-plus hours of sleep.</div>
            </div>
            <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-[rgba(242,233,219,0.10)] bg-[#241C15] px-3.5 py-2.5">
              <span className="flex-1 text-[13px] text-[#6F6E80]">Ask your journal…</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-[9px] text-white" style={{ background: "var(--co-accent)" }}><Arrow s={15} /></span>
            </div>
            <div className="mt-5 rounded-[14px] border border-[rgba(242,233,219,0.08)] bg-[#160F0A] p-4">
              <div className="font-serif text-[13px] italic text-[#C97A63]">your Sunday review</div>
              <p className="mt-2 font-serif text-[17px] leading-relaxed text-[#D7CCBA]">“A steadier week than it felt. You kept your mornings, shipped the billing fix, and gave yourself one true rest day. Carry that forward.”</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ CONSTELLATIONS ══ */}
      <section id="constellations" className="scroll-mt-[84px] bg-[#100B07] px-5 py-24 sm:px-7">
        <div className="mx-auto max-w-[1180px]">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <Reveal>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7E92BD]">The social layer</div>
              <h2 className="mt-3.5 font-serif text-4xl font-normal leading-[1.05] tracking-[-0.01em] sm:text-[46px]">Find your constellation.</h2>
              <p className="mt-5 text-[17px] leading-relaxed text-[#B6A892]">
                Navigators never found north from one star. They read a constellation, a small fixed group that makes a pattern you can trust. Yours is four to six people working toward their own goals, beside you.
              </p>
              <div className="mt-6 flex flex-col gap-3.5">
                {["A shared Life Score and a quiet shared dashboard", "Live chat when members are online, presence you can feel", "No feeds, no likes, no noise. A quiet room, not a Discord server."].map((t) => (
                  <div key={t} className="flex items-start gap-3 text-[15px] text-[#D7CCBA]"><span className="mt-0.5 shrink-0"><Check s={18} /></span>{t}</div>
                ))}
              </div>
            </Reveal>
            <Reveal className="rounded-[22px] border border-[rgba(126,146,189,0.18)] bg-[#161520] p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <svg width="22" height="22" viewBox="0 0 100 100" fill="none"><path d="M30 32 L58 24 L72 54 L44 70 Z" stroke="#7E92BD" strokeWidth="4" fill="none" strokeLinejoin="round" /><circle cx="30" cy="32" r="5" fill="#9FB0D6" /><circle cx="58" cy="24" r="5" fill="#9FB0D6" /><circle cx="72" cy="54" r="5" fill="#9FB0D6" /><circle cx="44" cy="70" r="5" fill="#9FB0D6" /></svg>
                  <span className="font-serif text-[19px] text-[#E7E5EE]">The 4AM Club</span>
                </div>
                <span className="rounded-full bg-[rgba(126,146,189,0.14)] px-2.5 py-1 text-xs text-[#8A8898]">5 members</span>
              </div>
              <div className="flex flex-col gap-2.5">
                {[
                  { i: "A", c: "#2D5FB0", m: "Locked in 3 deep-work hours today. Score's finally climbing 📈", on: true },
                  { i: "M", c: "#7A4C8F", m: "Same. Body area says rest tomorrow though, listening to it.", on: true },
                  { i: "S", c: "var(--co-accent)", m: "Proud of us. Same time tomorrow?", on: false },
                ].map((row, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <div className="relative flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ background: row.c }}>
                      {row.i}
                      {row.on && <span className="absolute -bottom-px -right-px h-2.5 w-2.5 rounded-full border-2 border-[#161520] bg-[#3FB872]" />}
                    </div>
                    <div className="rounded-xl rounded-tl-[4px] bg-[#1F1F2A] px-3.5 py-2 text-[13px] text-[#D8D6E0]">{row.m}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-[rgba(126,146,189,0.16)] bg-[#1F1F2A] px-3.5 py-2.5">
                <span className="flex-1 text-[13px] text-[#6F6E80]">Message your constellation…</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-[9px] text-white" style={{ background: "var(--co-accent)" }}><Arrow s={15} /></span>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══ TRUST STRIP (new) ══ */}
      <section className="px-5 py-20 sm:px-7">
        <Reveal className="mx-auto max-w-[1180px] rounded-[24px] border border-[rgba(242,233,219,0.09)] bg-[#1A140F] p-8 sm:p-10">
          <div className="grid items-center gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C97A63]">Your data is yours</div>
              <h2 className="mt-3 font-serif text-3xl font-normal leading-[1.1] sm:text-4xl">Private by design, not as an afterthought.</h2>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              {TRUST.map((t) => (
                <div key={t.title} className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0"><Check s={18} /></span>
                  <div>
                    <div className="text-sm font-semibold text-[#EFE6D6]">{t.title}</div>
                    <div className="mt-1 text-sm leading-relaxed text-[#9C8E78]">{t.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ══ ABOUT ══ */}
      <section id="about" className="scroll-mt-[84px] px-5 py-24 sm:px-7">
        <Reveal className="mx-auto max-w-[900px] text-center">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-[rgba(242,233,219,0.14)] px-3.5 py-1.5 text-[13px] text-[#C9BBA3]">
            <Needle s={14} />Made by GraviQ Studios
          </div>
          <h2 className="mt-5 font-serif text-4xl font-normal leading-[1.1] tracking-[-0.01em] sm:text-5xl">An independent, design-led studio, building in public from India.</h2>
          <p className="mx-auto mt-6 max-w-[680px] text-[18px] leading-[1.7] text-[#B6A892]">
            GraviQ Studios builds one product at a time, openly. Gravity pulls things into orbit, orbits become stars, stars become constellations. Cardinal OS is our attempt at a calm operating partner for a generation running their lives across too many tabs.
          </p>
        </Reveal>
      </section>

      {/* ══ REVIEWS ══ */}
      <section id="reviews" className="scroll-mt-[84px] bg-[#100B07] px-5 py-20 sm:px-7">
        <div className="mx-auto max-w-[1180px]">
          <Reveal className="mx-auto max-w-[640px] text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C97A63]">From the first cohort</div>
            <h2 className="mt-3.5 font-serif text-4xl font-normal leading-[1.05] tracking-[-0.01em] sm:text-[46px]">Early users, real mornings.</h2>
          </Reveal>
          <div className="mt-11 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {REVIEWS.map((r, i) => (
              <Reveal key={r.name} delay={(i % 3) * 80}>
                <div className="h-full rounded-[18px] border border-[rgba(242,233,219,0.09)] bg-[#1A140F] p-6">
                  <div className="flex gap-0.5 text-sm" style={{ color: "var(--co-accent)" }}>★★★★★</div>
                  <p className="mt-3.5 text-[15px] leading-relaxed text-[#D7CCBA]">“{r.quote}”</p>
                  <div className="mt-5 flex items-center gap-3">
                    <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full text-sm font-semibold text-white" style={{ background: r.color }}>{r.name.charAt(0)}</div>
                    <div>
                      <div className="text-sm font-semibold">{r.name}</div>
                      <div className="text-xs text-[#897C68]">{r.role}</div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="mt-8 text-center text-xs text-[#6E6250]">Illustrative reflections from our beta cohort, shared with permission.</p>
        </div>
      </section>

      {/* ══ FAQ ══ */}
      <section id="faq" className="scroll-mt-[84px] px-5 py-24 sm:px-7">
        <div className="mx-auto max-w-[780px]">
          <Reveal className="text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C97A63]">Questions</div>
            <h2 className="mt-3.5 font-serif text-4xl font-normal leading-[1.05] tracking-[-0.01em] sm:text-[46px]">Good to know.</h2>
          </Reveal>
          <div className="mt-10">
            <Faq />
          </div>
        </div>
      </section>

      {/* ══ FINAL CTA ══ */}
      <section id="contact" className="scroll-mt-[84px] px-5 pb-24 pt-8 sm:px-7">
        <Reveal className="relative mx-auto max-w-[1080px] overflow-hidden rounded-[28px] border px-6 py-16 text-center sm:px-10 sm:py-[72px]" >
          <div className="absolute inset-0 -z-0" style={{ background: "linear-gradient(160deg,#221A12,#18120C)", borderColor: "rgba(var(--co-accent-rgb),0.22)" }} />
          <div className="pointer-events-none absolute left-1/2 top-[-40%] h-[400px] w-[600px] max-w-[90%] -translate-x-1/2" style={{ background: "radial-gradient(ellipse at center, rgba(var(--co-accent-rgb),0.18), transparent 70%)" }} />
          <div className="relative">
            <div className="flex justify-center" style={{ filter: "drop-shadow(0 8px 22px rgba(var(--co-accent-rgb),0.35))" }}><Needle s={46} /></div>
            <h2 className="mt-5 font-serif text-4xl font-normal leading-[1.05] tracking-[-0.01em] sm:text-[54px]">Find your north.</h2>
            <p className="mx-auto mt-4 max-w-[520px] text-[18px] leading-relaxed text-[#B6A892]">One calm screen for your whole life. Free during beta, no card required. Everything you run, finally in one place.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a href="/signup" className="inline-flex items-center gap-2.5 rounded-xl px-7 py-4 text-base font-medium text-white transition-transform active:scale-[0.97]" style={{ background: "var(--co-accent)" }}>Create your account <Arrow /></a>
              <a href="/login" className="inline-flex items-center rounded-xl border border-[rgba(242,233,219,0.14)] bg-[#241C15] px-6 py-4 text-base font-medium text-[#EFE6D6] transition-colors hover:bg-[#2C2219]">Log in</a>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="border-t border-[rgba(242,233,219,0.08)] bg-[#100B07] px-5 pb-10 pt-16 sm:px-7">
        <div className="mx-auto max-w-[1180px]">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-2.5">
                <Needle s={22} />
                <span className="font-serif text-xl">Cardinal</span><span className="pt-1 text-[11px] font-semibold tracking-[0.18em] text-[#897C68]">OS</span>
              </div>
              <p className="mt-4 max-w-[260px] font-serif text-[17px] italic text-[#897C68]">One compass for everything.</p>
              <div className="mt-5 flex gap-2.5">
                {[
                  { href: "https://x.com/GraviQStudios", label: "X", d: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" },
                  { href: "https://www.linkedin.com/company/graviqstudios", label: "LinkedIn", d: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" },
                  { href: "https://github.com/graviqstudios/Cardinal-OS", label: "GitHub", d: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" },
                ].map((s) => (
                  <a key={s.label} href={s.href} aria-label={s.label} className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] border border-[rgba(242,233,219,0.1)] bg-[#1E170F] text-[#B6A892] transition-colors hover:text-[var(--co-accent)]"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d={s.d} /></svg></a>
                ))}
                <a href={`mailto:${EMAIL}`} aria-label="Email" className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] border border-[rgba(242,233,219,0.1)] bg-[#1E170F] text-[#B6A892] transition-colors hover:text-[var(--co-accent)]"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg></a>
              </div>
            </div>
            <FooterCol title="Product" links={[["Features", "#features"], ["Life Score", "#lifescore"], ["Constellations", "#constellations"], ["Get started", "/signup"]]} />
            <FooterCol title="Company" links={[["About", "#about"], ["Reviews", "#reviews"], ["GitHub", "https://github.com/graviqstudios/Cardinal-OS"], ["FAQ", "#faq"]]} />
            <div>
              <div className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#6E6250]">Contact</div>
              <div className="flex flex-col gap-3 text-sm">
                <a href={`mailto:${EMAIL}`} className="text-[#B6A892] transition-colors hover:text-[var(--co-accent)]">{EMAIL}</a>
                <a href="https://x.com/GraviQStudios" className="text-[#B6A892] transition-colors hover:text-[var(--co-accent)]">X / Twitter</a>
                <a href="https://www.linkedin.com/company/graviqstudios" className="text-[#B6A892] transition-colors hover:text-[var(--co-accent)]">LinkedIn</a>
              </div>
            </div>
          </div>
          <div className="mt-12 flex flex-wrap items-center justify-between gap-3.5 border-t border-[rgba(242,233,219,0.07)] pt-6">
            <div className="text-[13px] text-[#6E6250]">© 2026 GraviQ Studios · India · Free during beta</div>
            <div className="flex flex-wrap items-center gap-4 text-[13px]">
              <button onClick={() => setModal("privacy")} className="text-[#B6A892] transition-colors hover:text-[var(--co-accent)]">Privacy Policy</button>
              <button onClick={() => setModal("terms")} className="text-[#B6A892] transition-colors hover:text-[var(--co-accent)]">Terms &amp; Conditions</button>
              <button onClick={() => setModal("support")} className="text-[#B6A892] transition-colors hover:text-[var(--co-accent)]">Support</button>
            </div>
          </div>
        </div>
      </footer>

      {/* ══ TO TOP ══ */}
      <button
        aria-label="Back to top"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="fixed bottom-6 right-6 z-[90] flex h-12 w-12 items-center justify-center rounded-[14px] text-white shadow-[0_12px_30px_rgba(0,0,0,0.4)] transition-all"
        style={{ background: "var(--co-accent)", opacity: showTop ? 1 : 0, pointerEvents: showTop ? "auto" : "none", transform: showTop ? "translateY(0)" : "translateY(10px)" }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M6 11l6-6 6 6" /></svg>
      </button>

      {/* ══ MODALS ══ */}
      {modal && <LegalModal kind={modal} onClose={() => setModal(null)} />}
    </div>
  );
}

/* ── small pieces ─────────────────────────────────────────────────────────── */
function SoonTag() {
  return (
    <span className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide" style={{ background: "rgba(var(--co-accent-rgb),0.16)", color: "var(--co-accent)" }}>
      Rolling out
    </span>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#6E6250]">{title}</div>
      <div className="flex flex-col gap-3 text-sm">
        {links.map(([label, href]) => (
          <a key={label} href={href} className="text-[#B6A892] transition-colors hover:text-[var(--co-accent)]">{label}</a>
        ))}
      </div>
    </div>
  );
}

function Faq() {
  const [open, setOpen] = React.useState<number | null>(null);
  return (
    <div className="flex flex-col gap-3">
      {FAQS.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={i} className="overflow-hidden rounded-2xl border bg-[#1A140F]" style={{ borderColor: isOpen ? "rgba(var(--co-accent-rgb),0.32)" : "rgba(242,233,219,0.09)" }}>
            <button onClick={() => setOpen(isOpen ? null : i)} className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left text-[17px] font-medium text-[#F2E9DB]">
              {f.q}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#897C68" strokeWidth="2" strokeLinecap="round" className="shrink-0 transition-transform duration-200" style={{ transform: isOpen ? "rotate(180deg)" : "none" }}><path d="M6 9l6 6 6-6" /></svg>
            </button>
            <div className="grid transition-[grid-template-rows] duration-300" style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}>
              <div className="overflow-hidden">
                <p className="px-5 pb-5 text-[15px] leading-relaxed text-[#9C8E78]">{f.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LegalModal({ kind, onClose }: { kind: "privacy" | "terms" | "support"; onClose: () => void }) {
  const data = LEGAL[kind];
  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-center overflow-y-auto p-5 sm:p-10">
      <div className="fixed inset-0 bg-[rgba(8,5,3,0.8)] backdrop-blur-sm" onClick={onClose} />
      <div className="relative my-auto w-full max-w-[720px] rounded-[20px] border border-[rgba(242,233,219,0.12)] bg-[#1A140F] p-8 shadow-[0_40px_90px_rgba(0,0,0,0.6)] sm:p-10">
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-[9px] border border-[rgba(242,233,219,0.12)] bg-[#241C15] text-[#B6A892] transition-colors hover:text-[var(--co-accent)]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C97A63]">{data.eyebrow}</div>
        <h2 className="mt-2.5 font-serif text-3xl font-normal leading-[1.1]">{data.title}</h2>
        <div className="mt-2 text-xs text-[#897C68]">Last updated 15 June 2026</div>
        <div className="mt-6 flex flex-col gap-5">
          {data.sections.map((s) => (
            <div key={s.h}>
              <h3 className="text-[15px] font-semibold text-[#EFE6D6]">{s.h}</h3>
              <p className="mt-1.5 text-sm leading-[1.7] text-[#B6A892]">{s.p}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── data ─────────────────────────────────────────────────────────────────── */
const areaIcon = (path: React.ReactNode) => <svg width="28" height="28" viewBox="0 0 100 100" fill="none">{path}</svg>;

const AREAS: { name: string; desc: string; tint: string; soon?: boolean; icon: React.ReactNode }[] = [
  { name: "Habits", desc: "A gentle contribution grid. Streaks that forgive. “You're back, that's what counts.”", tint: "rgba(47,125,91,0.14)", icon: areaIcon(<><path d="M74 38 A28 28 0 1 0 78 56" stroke="#4FA37D" strokeWidth="7" strokeLinecap="round" fill="none" /><path d="M74 22 L76 40 L58 38" stroke="#4FA37D" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" /></>) },
  { name: "Tasks", desc: "GTD buckets and natural language. “Call Anuj tomorrow 5pm” becomes a task and an event.", tint: "rgba(45,95,176,0.14)", icon: areaIcon(<><path d="M24 50 H72" stroke="#5A87D6" strokeWidth="7" strokeLinecap="round" /><path d="M54 32 L74 50 L54 68" stroke="#5A87D6" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" /></>) },
  { name: "Projects", desc: "Turn a project into next actions with one tap. Progress that feeds your score.", tint: "rgba(122,76,143,0.16)", icon: areaIcon(<><path d="M22 76 H78" stroke="#A074B4" strokeWidth="7" strokeLinecap="round" /><path d="M30 76 V46 M50 76 V30 M70 76 V54" stroke="#A074B4" strokeWidth="7" strokeLinecap="round" /></>) },
  { name: "Goals & Skills", desc: "Identity-based goals and a skill tree. “I am someone who ships.” XP you actually earn.", tint: "rgba(122,76,143,0.16)", icon: areaIcon(<><path d="M22 78 L50 30 L50 78 Z" fill="rgba(160,116,180,0.5)" /><path d="M50 30 L78 78 L50 78 Z" fill="#A074B4" /></>) },
  { name: "Calendar", desc: "Two-way Google Calendar sync. Schedule in plain language, see it everywhere.", tint: "rgba(47,125,91,0.14)", icon: areaIcon(<><rect x="22" y="28" width="56" height="50" rx="10" stroke="#4FA37D" strokeWidth="7" /><path d="M22 44 H78 M36 22 V32 M64 22 V32" stroke="#4FA37D" strokeWidth="7" strokeLinecap="round" /></>) },
  { name: "Money", desc: "AI-categorised spend, budgets and savings goals. Notices when stress hits your wallet.", tint: "rgba(181,122,30,0.16)", icon: areaIcon(<><circle cx="50" cy="50" r="32" stroke="#C99535" strokeWidth="7" /><path d="M50 36 L62 50 L50 64 L38 50 Z" fill="#C99535" /></>) },
  { name: "Body", desc: "Workouts, sleep and energy, plus a built-in Pomodoro engine. “Five days straight, rest tomorrow.”", tint: "rgba(var(--co-accent-rgb),0.14)", soon: true, icon: areaIcon(<><circle cx="50" cy="50" r="30" stroke="var(--co-accent)" strokeWidth="7" /><path d="M50 30 L57 50 L50 46 L43 50 Z" fill="var(--co-accent)" /><path d="M50 70 L57 50 L43 50 Z" fill="rgba(var(--co-accent-rgb),0.45)" /></>) },
  { name: "Journal & Notes", desc: "Your second brain. Everything embedded, so you can ask your own notes anything.", tint: "rgba(181,122,30,0.16)", icon: areaIcon(<><rect x="28" y="24" width="38" height="46" rx="7" stroke="#D0A24A" strokeWidth="7" /><rect x="40" y="36" width="38" height="46" rx="7" stroke="#D0A24A" strokeWidth="7" /></>) },
  { name: "People", desc: "A quiet personal CRM. Gentle nudges to reach the people who matter, before drift sets in.", tint: "rgba(196,98,45,0.16)", soon: true, icon: areaIcon(<><path d="M20 66 H80" stroke="#D47A4A" strokeWidth="7" strokeLinecap="round" /><path d="M34 66 A16 16 0 0 1 66 66" stroke="#D47A4A" strokeWidth="7" strokeLinecap="round" /><path d="M50 30 V40 M70 40 L64 46 M30 40 L36 46" stroke="#D47A4A" strokeWidth="7" strokeLinecap="round" /></>) },
  { name: "Learn", desc: "Upload anything, chat with it, quiz yourself. Topics climb from weak to strong as you go.", tint: "rgba(45,95,176,0.14)", soon: true, icon: areaIcon(<><rect x="28" y="24" width="38" height="46" rx="7" stroke="#5A87D6" strokeWidth="7" /><rect x="40" y="36" width="38" height="46" rx="7" stroke="#5A87D6" strokeWidth="7" /></>) },
  { name: "Constellations", desc: "Groups of four to six who help you stay on course. A quiet room, not a Discord server.", tint: "rgba(59,79,114,0.22)", icon: areaIcon(<><path d="M30 32 L58 24 L72 54 L44 70 Z" stroke="#7E92BD" strokeWidth="4" fill="none" strokeLinejoin="round" /><circle cx="30" cy="32" r="5" fill="#9FB0D6" /><circle cx="58" cy="24" r="5" fill="#9FB0D6" /><circle cx="72" cy="54" r="5" fill="#9FB0D6" /><circle cx="44" cy="70" r="5" fill="#9FB0D6" /></>) },
];

const aiIcon = (path: React.ReactNode) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{path}</svg>;
const AI_FEATURES: { title: string; desc: string; soon?: boolean; icon: React.ReactNode }[] = [
  { title: "Daily briefing", desc: "A short read on your morning, already aware of what matters across your whole life.", icon: aiIcon(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>) },
  { title: "Sunday review", desc: "A weekly letter, not a dashboard. Written by Claude to be re-read and shared.", icon: aiIcon(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>) },
  { title: "Ask your notes", desc: "Your journal is embedded, so you can ask it anything and get grounded answers.", icon: aiIcon(<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></>) },
  { title: "Quick capture", desc: "Type it the way you think it. “gym tomorrow 6pm” becomes a task in under five seconds.", icon: aiIcon(<><path d="M12 5v14M5 12h14" /></>) },
  { title: "Projects into actions", desc: "Turn a fuzzy project into concrete next steps with a single tap.", icon: aiIcon(<><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>) },
  { title: "Spend, categorised", desc: "Transactions sorted for you, with a quiet nudge when stress starts hitting your wallet.", icon: aiIcon(<><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /></>) },
  { title: "Cross-life patterns", desc: "It notices what only shows up when habits, sleep, money and goals share one home.", icon: aiIcon(<><path d="M3 17l6-6 4 4 8-8" /></>) },
];

const TRUST = [
  { title: "Yours alone", desc: "Row-level security keeps your data visible only to you and the team running the service, never to other users." },
  { title: "Never trains a model", desc: "Nothing you create is used to train any AI model." },
  { title: "No selling, ever", desc: "We never sell your data, and there are no third-party ad trackers." },
  { title: "Built for 16+, India-first", desc: "Aligned with India's DPDP Act. Export or delete your data whenever you want." },
];

const REVIEWS = [
  { quote: "I closed four apps the week I started. The morning briefing actually knows what my day looks like. It feels calm, not naggy.", name: "Aditi R.", role: "NEET aspirant, Kochi", color: "#2D5FB0" },
  { quote: "The Sunday review reads like a letter from someone who's paying attention. I've screenshotted every one of them.", name: "Karthik M.", role: "Early-career dev, Bengaluru", color: "#7A4C8F" },
  { quote: "My constellation is the only reason I still wake up at 5. Nobody's performing, we just show up for each other quietly.", name: "Sneha P.", role: "Design student, Pune", color: "#2F7D5B" },
  { quote: "It told me my spending spikes when my sleep drops. No spreadsheet ever did that. Slightly unnerving, mostly brilliant.", name: "Rohan D.", role: "Creator, Hyderabad", color: "#B57A1E" },
  { quote: "I came for exam prep and stayed for everything else. Readiness is still there, but now my whole life has a dashboard.", name: "Nandini V.", role: "JEE aspirant, Chennai", color: "#C4622D" },
  { quote: "The focus timer cues my playlist and collapses everything else. Thirty calm minutes, then it asks how it went.", name: "Tanvi S.", role: "Final-year student, Delhi", color: "#3B4F72" },
];

const FAQS = [
  { q: "Is Cardinal OS really free?", a: "Yes. Free for everyone during the testing period. No Pro gates, no paywalls, no trial clocks. We want to learn from real people first. If pricing ever arrives, it will be transparent and never a dark pattern." },
  { q: "What exactly is the Life Score?", a: "One number from 0 to 1000 that blends habit consistency, goal and project velocity, task follow-through, and how evenly you're engaging across your life. It rewards a whole, balanced life rather than grinding a single area, and it never shows red." },
  { q: "Is my data private?", a: "Yes. Your data is yours: row-level security means only you, and the Cardinal team running the service, can ever access it, never other users. Nothing you write is used to train any AI model, and you can export or delete it whenever you want." },
  { q: "What are Constellations?", a: "Small groups of four to six people who help each other stay on course. You share a Life Score and a quiet dashboard, with live chat when members are online. No feeds, no likes, no notifications to outsiders. A quiet room, not a Discord server." },
  { q: "Does it still work for exam prep?", a: "Absolutely. Exam Prep is an installable template with Readiness Score, syllabus heat map, practice, mock predictor, a calm focus mode and a voice examiner. Your Exam Readiness becomes a domain score that feeds the main Life Score with extra weight as your exam nears." },
  { q: "Who makes Cardinal OS?", a: `GraviQ Studios, an independent, design-led studio in India that builds one product at a time, in public. Reach us any time at ${EMAIL}.` },
];

const LEGAL = {
  privacy: {
    eyebrow: "Legal",
    title: "Privacy Policy",
    sections: [
      { h: "Who we are", p: `Cardinal OS is operated by GraviQ Studios, an independent studio in India. For any privacy question, write to ${EMAIL}.` },
      { h: "What we collect", p: "Account details from Google sign-in (your name and email), the content you create inside Cardinal (habits, tasks, notes, goals and so on), and basic usage data that helps us improve the product." },
      { h: "How we use your data", p: "To run Cardinal, calculate your Life Score and power its AI features. We never sell your data, and nothing you write is ever used to train any model." },
      { h: "AI processing", p: "To deliver a feature, the minimum necessary content may be processed by our AI providers (Google Gemini and Anthropic Claude) solely to return your result. It is not used to train their models." },
      { h: "Storage and security", p: "Your data is stored with Supabase and encrypted in transit. Row-level security means only you can read your own data." },
      { h: "Your rights", p: "Under India's DPDP Act, 2023, you can access, correct, export or delete your data and withdraw consent at any time." },
    ],
  },
  terms: {
    eyebrow: "Legal",
    title: "Terms & Conditions",
    sections: [
      { h: "Agreement", p: "By using Cardinal OS you agree to these terms. If you don't agree, please don't use the service." },
      { h: "Eligibility", p: "You must be at least 16 years old to use Cardinal OS." },
      { h: "Beta and pricing", p: "Cardinal is free during the testing period and provided as is. Features may change, pause or be removed as we learn from real use." },
      { h: "Your account", p: "Keep your login secure. You are responsible for activity under your account." },
      { h: "Acceptable use", p: "Don't misuse the service: no illegal, harmful or abusive activity, no scraping or reverse engineering, and treat your constellation members with respect." },
      { h: "Your content", p: "You own what you create. You grant GraviQ Studios a limited licence to store and process it solely to provide the service to you." },
      { h: "No professional advice", p: "Cardinal supports your planning but is not medical, financial, legal or professional advice. The Life Score is informational only." },
      { h: "Governing law", p: `These terms are governed by the laws of India. Questions: ${EMAIL}.` },
    ],
  },
  support: {
    eyebrow: "Help",
    title: "Support",
    sections: [
      { h: "Email us", p: `We read everything. Reach the team directly at ${EMAIL}.` },
      { h: "Report a bug", p: "Open an issue on GitHub at github.com/graviqstudios/Cardinal-OS and we will take a look." },
      { h: "Response time", p: "We aim to reply within 2 to 3 working days during beta. Follow along on X and LinkedIn for updates." },
    ],
  },
} as const;
