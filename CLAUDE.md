# Cardinal OS - Project Conventions

This file is read automatically by Claude Code. Follow it for ALL work in this repo.

## Design system is mandatory
The complete brand and design system lives in:
- `Design/BRAND.md`      - the spec (logo, type, color, motion, components, the "why")
- `Design/tokens.css` - every color, font, radius, spacing, and motion value as CSS variables
- `Design/assets/`      - logo and module-mark SVG assets
- `Design/index.html` - the entire html file containing the themes and design idea

**Rules:**
1. Never hard-code a color, font, radius, or duration. Always use the tokens
   from `tokens.css` (e.g. `var(--accent)`, `var(--surface)`, `var(--font-serif)`,
   `var(--r-card)`, `var(--dur-modal)`).
2. Set the active theme with `data-theme` on `<html>` (parchment | study | sage |
   dusk | ink) and the accent with `data-accent` (cardinal | ochre | pine |
   cobalt | plum). Default: `data-theme="parchment" data-accent="cardinal"`.
3. Typography: **Instrument Serif** for brand moments, headings, and large
   readiness numerals; **Instrument Sans** for all UI, body, and labels. Numerals
   use `font-variant-numeric: tabular-nums`.
4. Use the logo and module marks from `Design/assets/` - do not redraw them.
5. Motion: soft easing `cubic-bezier(0.2,0,0,1)`, no bounce/spin, and no
   interaction animation longer than 250ms. Respect `prefers-reduced-motion`.
6. Module identity colors are fixed: Readiness `#CB4B33`, Study `#2D5FB0`,
   Calendar `#2F7D5B`, Goals `#7A4C8F`, Money `#B57A1E`.

## Voice
Calm, premium, product-centric. Never anxiety-driven. Positioning:
"Your AI tutor, planner, and progress tracker in one place, so you always know
what to study next."

When in doubt about a visual decision, open `Design/BRAND.md` and match it.
