# app/api

Route handlers live here (added from Phase 1 onward): `chat`, `quiz`, `embed`,
`readiness`, `schedule`, `insights`, and `webhooks/razorpay`.

Every route runs on the **Node.js runtime** - never add `export const runtime = "edge"`.
All AI routes will be rate-limited per user (Upstash, keyed by `auth.uid()`).

Phase 0 ships this directory with no routes by design.
