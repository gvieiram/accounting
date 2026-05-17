import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { Logo } from "@/components/logo";
import { messages } from "@/content/messages";
import { getSession } from "@/lib/auth/helpers";
import { safeNext } from "@/lib/auth/safe-redirect";
import { db } from "@/lib/db";
import { resolveAll } from "@/lib/posthog/flags";

export const metadata: Metadata = {
	title: messages.auth.login.metadata.title,
	robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LoginPage({
	searchParams,
}: {
	searchParams: Promise<{ next?: string; error?: string }>;
}) {
	const params = await searchParams;

	// Skip the "already-logged-in" pre-check when an `?error=…` is present:
	// the user must see the toast (e.g. EXPIRED_TOKEN, session_invalidated)
	// and request a fresh magic link, otherwise we'd bounce them straight
	// back into a protected area before the error is ever rendered.
	if (!params.error) {
		const session = await getSession();
		if (session) {
			// Look up role here — `getSession()` returns the Better Auth
			// session shape which doesn't include our app-level `role`. The
			// extra DB hit fires only on the rare path of a logged-in user
			// hitting /login by mistake (bookmark, tab swap), so the cost
			// is acceptable. The alternative would be extending the Better
			// Auth session payload with our `role` field, which leaks app
			// schema into auth config — worse trade-off for a rare hit.
			const user = await db.user.findUnique({
				where: { id: session.user.id },
				select: { role: true, revokedAt: true },
			});

			if (user && !user.revokedAt) {
				redirect(safeNext(params.next, user.role));
			}
			// If the session is orphan/revoked, fall through to the form.
			// The user will request a fresh magic link; subsequent
			// `requireAdmin()` calls also catch this state.
		}
	}

	const flags = await resolveAll();

	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
			<div className="flex w-full max-w-sm flex-col gap-6">
				<a href="/" className="flex items-center gap-2 self-center font-medium">
					<Logo animated={false} />
				</a>
				<LoginForm
					showProviderChooser={flags.isAdminLoginExtraProvidersEnabled}
					searchParamsPromise={searchParams}
				/>
			</div>
		</div>
	);
}
