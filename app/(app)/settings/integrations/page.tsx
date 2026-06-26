import { Plug } from "lucide-react";

import { createClient, getUser } from "@/lib/supabase/server";
import { PROVIDERS } from "@/lib/integrations/registry";
import { isProviderConfigured, hasEncryptionKey } from "@/lib/integrations/config";
import { getConnections } from "@/lib/integrations/queries";
import { PageHeader } from "@/components/shell/page-header";
import { IntegrationsClient } from "@/components/settings/integrations-client";

export default async function IntegrationsPage() {
  const connections = await getConnections();
  const encKey = hasEncryptionKey();

  const user = await getUser();
  const supabase = await createClient();
  const { data: profile } = user
    ? await supabase
        .from("users")
        .select("focus_playlist_id, focus_playlist_name")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };
  const spotifyFocus =
    profile?.focus_playlist_id && profile?.focus_playlist_name
      ? { id: profile.focus_playlist_id as string, name: profile.focus_playlist_name as string }
      : null;

  const providers = PROVIDERS.map((p) => {
    const conn = connections.find((c) => c.provider === p.id) ?? null;
    return {
      ...p,
      configured: isProviderConfigured(p.id) && encKey,
      connected: conn,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        description="Connect the apps you already use. Cardinal never replaces them, it connects them."
        icon={<Plug className="h-5 w-5" />}
      />
      <IntegrationsClient
        providers={providers}
        encKeyMissing={!encKey}
        spotifyFocus={spotifyFocus}
      />
    </div>
  );
}
