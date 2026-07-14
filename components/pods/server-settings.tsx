"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Globe, Loader2, Lock, Upload, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { updateServer } from "@/lib/pods/actions";
import type { ServerDetail, Visibility } from "@/lib/pods/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tap } from "@/components/motion/tap";

export function ServerSettings({
  server,
  onClose,
}: {
  server: ServerDetail;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = React.useState(server.name);
  const [description, setDescription] = React.useState(server.description ?? "");
  const [visibility, setVisibility] = React.useState<Visibility>(server.visibility);
  const [iconUrl, setIconUrl] = React.useState(server.icon_url);
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "png";
      const path = `${server.created_by}/${server.id}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("server-icons")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw new Error(upErr.message);
      const { data } = supabase.storage.from("server-icons").getPublicUrl(path);
      const url = `${data.publicUrl}?v=${Date.now()}`;
      setIconUrl(url);
      await updateServer(server.id, { icon_url: url });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    const res = await updateServer(server.id, { name, description, visibility });
    setSaving(false);
    if (res.ok) {
      onClose();
      router.refresh();
    } else {
      setError(res.error);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md space-y-4 rounded-card border bg-card p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl tracking-tight">Server settings</h2>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-card bg-primary/10 text-xl font-semibold text-primary">
            {iconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={iconUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              name.charAt(0).toUpperCase()
            )}
          </span>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
          <Tap className="inline-flex">
            <Button variant="secondary" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload icon
            </Button>
          </Tap>
        </div>

        <label className="block space-y-1 text-xs font-medium text-muted-foreground">
          Server name
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <label className="block space-y-1 text-xs font-medium text-muted-foreground">
          Description
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="resize-none"
            placeholder="What is this server about?"
          />
        </label>

        <div className="space-y-1 text-xs font-medium text-muted-foreground">
          Visibility
          <div className="grid grid-cols-2 gap-2">
            <VisibilityButton
              active={visibility === "private"}
              onClick={() => setVisibility("private")}
              icon={<Lock className="h-4 w-4" />}
              label="Private"
              hint="Invite code only"
            />
            <VisibilityButton
              active={visibility === "public"}
              onClick={() => setVisibility("public")}
              icon={<Globe className="h-4 w-4" />}
              label="Public"
              hint="Listed in Discover"
            />
          </div>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Tap className="inline-flex">
            <Button onClick={save} disabled={saving || !name.trim()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </Tap>
        </div>
      </div>
    </div>
  );
}

function VisibilityButton({
  active,
  onClick,
  icon,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-1 rounded-card border p-3 text-left transition-colors",
        active ? "border-primary bg-primary/5" : "hover:bg-accent",
      )}
    >
      <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        {icon}
        {label}
      </span>
      <span className="text-[11px] text-muted-foreground">{hint}</span>
    </button>
  );
}
