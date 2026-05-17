"use client";

import { magicLinkClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// `baseURL` is intentionally omitted: Better Auth resolves to same-origin in
// the browser (`window.location.origin`), which is the correct behaviour for
// every environment (dev/preview/staging/prod) without relying on a public
// env var that could silently fall back to `localhost` if forgotten.
export const authClient = createAuthClient({
	plugins: [magicLinkClient()],
});

export const { signIn, signOut, useSession } = authClient;
