"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  Copy,
  Hash,
  Loader2,
  LogOut,
  Plus,
  Settings,
  Trash2,
  Volume2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  createCategory,
  createChannel,
  deleteChannel,
} from "@/lib/pods/channels";
import { leavePod, deleteServer } from "@/lib/pods/actions";
import type { Channel, ChannelType, ServerDetail } from "@/lib/pods/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ServerSettings } from "@/components/pods/server-settings";

export function ChannelSidebar({
  server,
  activeChannelId,
}: {
  server: ServerDetail;
  activeChannelId: string | null;
}) {
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [addingCategory, setAddingCategory] = React.useState(false);

  const uncategorized = server.channels.filter((c) => c.category_id == null);

  function copyInvite() {
    void navigator.clipboard.writeText(server.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function leave() {
    await leavePod(server.id);
    router.push("/constellations");
  }
  async function remove() {
    if (!confirm("Delete this server for everyone? This cannot be undone.")) return;
    await deleteServer(server.id);
    router.push("/constellations");
  }

  return (
    <div className="flex w-60 shrink-0 flex-col border-r bg-muted/20">
      {/* Server header */}
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <span className="truncate text-sm font-semibold" title={server.name}>
          {server.name}
        </span>
        {server.isOwner && (
          <button
            onClick={() => setSettingsOpen(true)}
            className="rounded p-1 text-muted-foreground hover:text-foreground"
            aria-label="Server settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Channels */}
      <div className="flex-1 space-y-3 overflow-y-auto p-2">
        {uncategorized.length > 0 && (
          <div className="space-y-0.5">
            {uncategorized.map((c) => (
              <ChannelRow
                key={c.id}
                channel={c}
                serverId={server.id}
                active={c.id === activeChannelId}
                isOwner={server.isOwner}
              />
            ))}
          </div>
        )}

        {server.categories.map((cat) => (
          <CategoryBlock
            key={cat.id}
            categoryId={cat.id}
            name={cat.name}
            serverId={server.id}
            isOwner={server.isOwner}
            channels={server.channels.filter((c) => c.category_id === cat.id)}
            activeChannelId={activeChannelId}
          />
        ))}

        {server.isOwner &&
          (addingCategory ? (
            <InlineForm
              placeholder="Category name"
              onSubmit={async (name) => {
                await createCategory(server.id, name);
                setAddingCategory(false);
                router.refresh();
              }}
              onCancel={() => setAddingCategory(false)}
            />
          ) : (
            <button
              onClick={() => setAddingCategory(true)}
              className="flex w-full items-center gap-1 px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" /> Add category
            </button>
          ))}
      </div>

      {/* Footer: invite + leave/delete */}
      <div className="space-y-2 border-t p-3">
        <button
          onClick={copyInvite}
          className="flex w-full items-center justify-between rounded-button border bg-background px-2 py-1.5 text-xs"
          title="Copy invite code"
        >
          <span className="font-mono">{server.invite_code}</span>
          {copied ? (
            <Check className="h-3.5 w-3.5 text-[hsl(var(--status-strong))]" />
          ) : (
            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>
        {server.isOwner ? (
          <Button variant="ghost" size="sm" className="w-full justify-start text-destructive" onClick={remove}>
            <Trash2 className="h-4 w-4" /> Delete server
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={leave}>
            <LogOut className="h-4 w-4" /> Leave server
          </Button>
        )}
      </div>

      {settingsOpen && (
        <ServerSettings server={server} onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
}

function CategoryBlock({
  categoryId,
  name,
  serverId,
  isOwner,
  channels,
  activeChannelId,
}: {
  categoryId: string;
  name: string;
  serverId: string;
  isOwner: boolean;
  channels: Channel[];
  activeChannelId: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(true);
  const [adding, setAdding] = React.useState(false);
  const [type, setType] = React.useState<ChannelType>("text");

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1 px-1">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
        >
          <ChevronDown className={cn("h-3 w-3 transition-transform", !open && "-rotate-90")} />
          {name}
        </button>
        {isOwner && (
          <button
            onClick={() => setAdding((a) => !a)}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground"
            aria-label="Add channel"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && (
        <>
          {channels.map((c) => (
            <ChannelRow
              key={c.id}
              channel={c}
              serverId={serverId}
              active={c.id === activeChannelId}
              isOwner={isOwner}
            />
          ))}
          {adding && (
            <div className="space-y-1 px-1 py-1">
              <div className="flex gap-1">
                <button
                  onClick={() => setType("text")}
                  className={cn(
                    "flex-1 rounded-button border px-2 py-0.5 text-xs",
                    type === "text" ? "border-foreground bg-foreground/10" : "text-muted-foreground",
                  )}
                >
                  Text
                </button>
                <button
                  onClick={() => setType("voice")}
                  className={cn(
                    "flex-1 rounded-button border px-2 py-0.5 text-xs",
                    type === "voice" ? "border-foreground bg-foreground/10" : "text-muted-foreground",
                  )}
                >
                  Voice
                </button>
              </div>
              <InlineForm
                placeholder={`New ${type} channel`}
                onSubmit={async (name) => {
                  await createChannel({ podId: serverId, name, type, categoryId });
                  setAdding(false);
                  router.refresh();
                }}
                onCancel={() => setAdding(false)}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ChannelRow({
  channel,
  serverId,
  active,
  isOwner,
}: {
  channel: Channel;
  serverId: string;
  active: boolean;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const Icon = channel.type === "voice" ? Volume2 : Hash;

  return (
    <div
      className={cn(
        "group flex items-center gap-1 rounded-button px-2 py-1",
        active ? "bg-accent" : "hover:bg-accent/60",
      )}
    >
      <Link
        href={`/constellations/${serverId}/${channel.id}`}
        className="flex flex-1 items-center gap-1.5 truncate text-sm text-muted-foreground group-hover:text-foreground"
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{channel.name}</span>
      </Link>
      {isOwner && (
        <button
          aria-label="Delete channel"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await deleteChannel(serverId, channel.id);
              router.refresh();
            })
          }
          className="rounded p-0.5 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function InlineForm({
  placeholder,
  onSubmit,
  onCancel,
}: {
  placeholder: string;
  onSubmit: (name: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [value, setValue] = React.useState("");
  const [pending, start] = React.useTransition();
  return (
    <form
      className="flex gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim()) return;
        const name = value;
        setValue("");
        start(() => onSubmit(name));
      }}
    >
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="h-7 text-xs"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
        }}
      />
      <Button type="submit" size="icon" className="h-7 w-7 shrink-0" disabled={pending}>
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
      </Button>
    </form>
  );
}
