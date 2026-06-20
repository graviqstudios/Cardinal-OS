/**
 * Instant route-transition skeleton for the app shell. Shows immediately on
 * navigation so switching tabs feels responsive while the server renders the
 * page. Mirrors the common page shape: a header line + a couple of card blocks.
 */
export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" aria-hidden="true">
      <div className="space-y-3">
        <div className="h-3 w-32 rounded-pill bg-muted" />
        <div className="h-9 w-72 max-w-[80%] rounded-card bg-muted" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-64 rounded-card border bg-muted/50" />
        <div className="space-y-6">
          <div className="h-28 rounded-card border bg-muted/50" />
          <div className="h-28 rounded-card border bg-muted/50" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-48 rounded-card border bg-muted/50" />
        <div className="h-48 rounded-card border bg-muted/50" />
      </div>
    </div>
  );
}
