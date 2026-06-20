import { Plug } from "lucide-react";

import { PROVIDERS } from "@/lib/integrations/registry";
import { isProviderConfigured, hasEncryptionKey } from "@/lib/integrations/config";
import { getConnections } from "@/lib/integrations/queries";
import { PageHeader } from "@/components/shell/page-header";
import { IntegrationsClient } from "@/components/settings/integrations-client";

export default async function IntegrationsPage() {
  const connections = await getConnections();
  const encKey = hasEncryptionKey();

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
      <IntegrationsClient providers={providers} encKeyMissing={!encKey} />
    </div>
  );
}
