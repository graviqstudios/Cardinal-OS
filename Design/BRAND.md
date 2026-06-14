# Cardinal OS — Brand \& Design System

A developer handoff spec. Everything here is framework-agnostic. Pair it with
`tokens.css` (all values as CSS variables) and the SVGs in `assets/`.

> Product context only, not design direction: Cardinal OS is an all-in-one study
> app for exam-prep students. Core object is the \*\*Readiness Score\*\* (0–1000).
> Modules: Readiness, Study Assistant, Calendar, Goals \& Career, Money Tracker.

**Positioning line:** "Your AI tutor, planner, and progress tracker in one place,
so you always know what to study next."

\---

## 1\. Personality

Pro and restrained. Looks like it shipped from a design-led studio. Calm and
premium, never anxious or gamified. Motion clarifies, it never performs.

Three words: **clear, crafted, grounded.**

\---

## 2\. Logo

The mark is **The Needle**: a two-facet compass needle. Long sharp north point,
short south point, split into two tones at the horizon so it reads as an
instrument, not a flat icon. It is the thing you orient toward.

|File|Use|
|-|-|
|`assets/logo-needle.svg`|Primary. Cardinal red north, bone south.|
|`assets/logo-needle-mono.svg`|Single color via `currentColor`, for tinting.|
|`assets/logo-needle-housing.svg`|Needle inside compass ring, for splash / marketing.|
|`assets/logo-cardinal-c.svg`|"Cardinal C" monogram alternate.|
|`assets/app-icon.svg`|Rounded tile, white needle on cardinal.|
|`assets/favicon.svg`|32px tuned tile.|

**Construction.** Drawn on a fixed vertical axis. North point is \~1.6x the
length of south. Pivot sits at optical centre. Facets split on the horizon line.

**Clear space.** Keep 0.25x the mark's width clear on all sides.

**Minimum sizes.** Holds down to **16px**. Below 24px use the solid app-icon
version rather than the two-facet needle (the bone facet gets muddy).

**Don'ts.** Don't recolor the facets outside the palette. Don't rotate the
needle off vertical in the static logo (only the live readiness needle swings).
Don't add a drop shadow except the soft brand glow on dark hero surfaces.

\---

## 3\. Wordmark

* **Name** set in **Instrument Serif**, regular. e.g. *Cardinal*.
* **"OS"** set in **Instrument Sans**, 500, tracked `0.16em`, in `--muted`.
* Italic Instrument Serif is allowed for editorial and pull quotes.
* All-caps tracked Instrument Sans (`0.26em`) is the cover/poster lockup.

Primary lockup: serif "Cardinal" + small tracked sans "OS".

\---

## 4\. Typography

Two families. **Instrument Serif** for brand moments, headings, and the big
readiness numerals. **Instrument Sans** for all UI, body, labels, and data.

Load (Google Fonts):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400;0,500;0,600;1,400\&family=Instrument+Serif:ital@0;1\&display=swap" rel="stylesheet">
```

|Role|Family|Size / Line|Weight|Tracking|
|-|-|-|-|-|
|Display|Serif|60 / 1.0|400|-0.01em|
|Heading|Serif|34 / 1.1|400|normal|
|Numeral (score)|Serif|48–60 / 1.0|400|tabular-nums|
|Title|Sans|22 / 1.3|600|-0.01em|
|Body|Sans|16 / 1.6|400|normal|
|Caption|Sans|13 / 1.5|400|normal|
|Label|Sans|12 / 1.0|600|0.14em, UPPERCASE|

Rule: every numeral, score, currency and data figure uses **tabular figures**
(`font-variant-numeric: tabular-nums`) so the readiness count never reflows.

\---

## 5\. Color

One confident red over warm ink-and-parchment neutrals. The red is the only
strong hue; everything structural is warm neutral.

**Brand constant**

* Cardinal `#CB4B33` (hover `#B84026`), Bone `#C9BBA3`.

**Themes** (each a full set of `--bg --surface --surface-2 --text --muted --border --accent`):

|Theme|Mode|bg|surface|text|accent|
|-|-|-|-|-|-|
|Parchment|light, default|`#F5EFE3`|`#FFFCF5`|`#221C14`|`#C2412E`|
|Study|warm dark|`#1A140F`|`#241C15`|`#EFE6D6`|`#D6593E`|
|Sage|calm light|`#EBEDE5`|`#FBFCF8`|`#1E241C`|`#C2412E`|
|Dusk|cool twilight|`#16161E`|`#1F1F2A`|`#E7E5EE`|`#D6593E`|
|Ink|true black|`#0B0907`|`#141009`|`#F5EEE0`|`#DC6045`|

The accent is a per-theme-tuned cardinal so it stays legible on each background.

**Accents** (user picks one on first launch, overrides `--accent`):
Cardinal `#CB4B33` · Ochre `#B57A1E` · Pine `#2F7D5B` · Cobalt `#2D5FB0` · Plum `#7A4C8F`.

**Modules** (fixed, theme-independent, used for the mark, chips, headers):
Readiness `#CB4B33` · Study `#2D5FB0` · Calendar `#2F7D5B` · Goals `#7A4C8F` · Money `#B57A1E`.

Components must read tokens (`var(--surface)`, `var(--accent)`), never a hex.
Switching theme cross-fades `--bg`/`--text` in 200ms and persists per user.

\---

## 6\. Module marks

One geometric family, single weight, each in its fixed module color. Legible at
a glance, never decorative.

|Module|Mark name|File|Base color|Glyph tint (on dark)|
|-|-|-|-|-|
|Readiness|The Needle|`assets/module-readiness.svg`|`#CB4B33`|`#CB4B33`|
|Study Assistant|The Folio|`assets/module-study.svg`|`#2D5FB0`|`#5A87D6`|
|Calendar|The Almanac|`assets/module-calendar.svg`|`#2F7D5B`|`#4FA37D`|
|Goals \& Career|The Summit|`assets/module-goals.svg`|`#7A4C8F`|`#A074B4`|
|Money Tracker|The Coin|`assets/module-money.svg`|`#B57A1E`|`#C99535`|

The **base color** is the module's identity, used for chip backgrounds/borders,
fills, labels and progress. The **glyph tint** is one step lighter and is how the
line-art mark itself is drawn so it stays legible on dark surfaces; the SVGs in
`assets/` ship in this glyph tint, matching the showcase. On light surfaces,
recolor the glyph to the base color.

Chip pattern: mark + label on a 10–14% tint of the module color with a
\~24% border of the same. See section 8.

\---

## 7\. Motion

Soft easing (`cubic-bezier(0.2, 0, 0, 1)`), no bounce, no spin.
**Hard rule: no interaction animation exceeds 250ms.**

|Pattern|Spec|
|-|-|
|Tap press|scale 0.95, 120ms, on `:active`|
|Hover / toggle / theme cross-fade|200ms|
|Modal / sheet entrance|scale 0.95 → 1 + fade, 240ms|
|List stagger|120ms stagger, 10px rise per row|
|Score count-up|number tween, \~1.2s ease-out (data reveal, one-shot)|
|Heat-map fill|width + color, \~1.1s ease-out (data reveal, one-shot)|

The two "reveal" animations run longer than 250ms on purpose: they are one-shot
data visualisations, not interactions. Everything the user drives stays ≤250ms.

`prefers-reduced-motion: reduce` → drop to instant or a pure fade, never block input.

\---

## 8\. The signature object: Readiness ring

The logo doubles as a live instrument at the top of every screen.

* A ring (stroke) fills to `score / 1000` in the accent/cardinal color.
* The number sits inside, set in Instrument Serif, tabular figures.
* On change: ring animates to the new fill, number tweens (\~1.2s ease-out).
* Trend pill ("up 18 today") in Pine when positive.

```html
<div class="readiness" data-score="742">
  <svg viewBox="0 0 140 140" width="120" height="120" fill="none">
    <circle cx="70" cy="70" r="60" stroke="var(--border)" stroke-width="8"/>
    <circle cx="70" cy="70" r="60" stroke="var(--accent)" stroke-width="8"
            stroke-linecap="round" pathLength="1000"
            stroke-dasharray="742 1000" transform="rotate(-90 70 70)"/>
  </svg>
  <span class="numeral">742</span>
</div>
```

Tip: set `pathLength="1000"` on the ring so `stroke-dasharray="<score> 1000"`
maps the score directly with no circumference math.

\---

## 9\. Component cheatsheet

* **Button (primary):** `--accent` bg, `--on-accent` text, radius 10px, press-scale 0.95.
* **Button (secondary):** `--surface-2` bg, 1px `--border`, `--text`.
* **Card:** `--surface` bg, 1px `--border`, radius 18px, padding 24px.
* **Module chip:** module color at 12% bg, same at 24% border, radius 10px, mark + 12px/500 label.
* **Input:** `--surface-2` bg, 1px `--border`, radius 10px, placeholder `--muted`.
* **Pill / badge:** radius 999px; positive trend uses Pine, negative uses Cardinal.

\---

## 10\. Files in this handoff

```
Design/
  BRAND.md                     this file
  index.html                   standalone, pixel-exact copy of the v2 brand showcase
  tokens.css                   all tokens + themes + accents + base primitives
  assets/
    logo-needle.svg            primary mark
    wordmark.svg               horizontal lockup (mark + serif name)
    logo-needle-mono.svg       single-color (currentColor)
    logo-needle-housing.svg    mark in compass ring
    logo-cardinal-c.svg        monogram alternate
    app-icon.svg               rounded app tile
    favicon.svg                32px tile
    module-readiness.svg       The Needle
    module-study.svg           The Folio
    module-calendar.svg        The Almanac
    module-goals.svg           The Summit
    module-money.svg           The Coin
```

**Quick start:** open `index.html` to see the full brand showcase (identical to
the v2 design). To build: import `tokens.css`, set `data-theme="parchment"` on
`<html>`, build with `var(--token)` only, and pull marks from `assets/`.
Everything else in this doc is the why.

