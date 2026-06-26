"use client";

import * as React from "react";

import { registerPush } from "@/lib/native/push";

/**
 * Registers this device for push once, when mounted inside the authenticated
 * shell (so there's a signed-in user to attach the FCM token to). No-op on web.
 */
export function PushRegistrar() {
  React.useEffect(() => {
    void registerPush();
  }, []);
  return null;
}
