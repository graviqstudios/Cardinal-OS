/** GitHub-style contribution grid of habit completions over the last ~10 weeks. */
export function HabitGrid({ completedDates }: { completedDates: string[] }) {
  const done = new Set(completedDates);

  const key = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Start on the Sunday on/before (today - 69 days) so columns align to weeks.
  const start = new Date(today);
  start.setDate(start.getDate() - 69);
  start.setDate(start.getDate() - start.getDay());

  const cells: { k: string; done: boolean; future: boolean }[] = [];
  const cursor = new Date(start);
  while (cursor <= today || cursor.getDay() !== 0) {
    const k = key(cursor);
    cells.push({ k, done: done.has(k), future: cursor > today });
    cursor.setDate(cursor.getDate() + 1);
    if (cursor > today && cursor.getDay() === 0) break;
  }

  return (
    <div
      className="grid grid-flow-col grid-rows-7 gap-[3px]"
      style={{ width: "fit-content" }}
      aria-hidden
    >
      {cells.map((c, i) => (
        <span
          key={i}
          className="h-[10px] w-[10px] rounded-[2px]"
          style={{
            backgroundColor: c.future
              ? "transparent"
              : c.done
                ? "hsl(var(--module-habits))"
                : "hsl(var(--muted-foreground) / 0.18)",
          }}
        />
      ))}
    </div>
  );
}
