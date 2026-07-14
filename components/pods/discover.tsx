"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Search, Users } from "lucide-react";

import { joinPublicServer, searchPublicServers } from "@/lib/pods/actions";
import type { PublicServer } from "@/lib/pods/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tap } from "@/components/motion/tap";

export function Discover({
  initial,
  myServerIds,
}: {
  initial: PublicServer[];
  myServerIds: string[];
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [servers, setServers] = React.useState<PublicServer[]>(initial);
  const [searching, setSearching] = React.useState(false);
  const [joiningId, setJoiningId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const joined = React.useMemo(() => new Set(myServerIds), [myServerIds]);

  // Debounced search.
  React.useEffect(() => {
    const id = setTimeout(() => {
      setSearching(true);
      void searchPublicServers(query).then((rows) => {
        setServers(rows);
        setSearching(false);
      });
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  async function join(server: PublicServer) {
    if (joined.has(server.id)) {
      router.push(`/constellations/${server.id}`);
      return;
    }
    setJoiningId(server.id);
    setError(null);
    const res = await joinPublicServer(server.id);
    setJoiningId(null);
    if (res.ok && res.data) router.push(`/constellations/${res.data.id}`);
    else if (!res.ok) setError(res.error);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl tracking-tight">Discover</h1>
        <p className="text-sm text-muted-foreground">
          Browse public study servers and join instantly.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search public servers"
          className="pl-9"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {searching && servers.length === 0 ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : servers.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No public servers yet. Create one and set it to Public to list it here.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {servers.map((s) => (
            <Card key={s.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10 text-base font-semibold text-primary">
                    {s.icon_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.icon_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      s.name.charAt(0).toUpperCase()
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{s.name}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {s.member_count} member{s.member_count === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <p className="line-clamp-3 flex-1 text-sm text-muted-foreground">
                  {s.description || "A study server on Cardinal."}
                </p>
                <Tap className="inline-flex">
                  <Button
                    size="sm"
                    variant={joined.has(s.id) ? "secondary" : "default"}
                    className="w-full"
                    disabled={joiningId === s.id}
                    onClick={() => join(s)}
                  >
                    {joiningId === s.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : joined.has(s.id) ? (
                      <>
                        <Check className="h-4 w-4" /> Open
                      </>
                    ) : (
                      "Join"
                    )}
                  </Button>
                </Tap>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
