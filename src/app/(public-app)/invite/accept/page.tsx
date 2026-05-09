import type { Metadata } from "next";

import { Logo } from "@/components/logo";
import { hashInvitationToken } from "@/lib/auth/invitation-token";
import { db } from "@/lib/db";
import { InviteAcceptCard } from "./_components/invite-accept-card";
import {
	InviteAcceptError,
	type InviteAcceptErrorReason,
} from "./_components/invite-accept-error";

export const metadata: Metadata = {
	title: "Aceitar convite",
	robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function InviteAcceptPage({
	searchParams,
}: {
	searchParams: Promise<{ token?: string }>;
}) {
	const { token } = await searchParams;

	const result = await validateToken(token);

	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
			<div className="flex w-full max-w-sm flex-col gap-6">
				<a href="/" className="flex items-center gap-2 self-center font-medium">
					<Logo animated={false} />
				</a>
				{result.kind === "ok" ? (
					<InviteAcceptCard
						token={result.token}
						email={result.email}
						name={result.name}
					/>
				) : (
					<InviteAcceptError reason={result.reason} />
				)}
			</div>
		</div>
	);
}

type ValidationResult =
	| {
			kind: "ok";
			token: string;
			email: string;
			name: string | null;
	  }
	| {
			kind: "error";
			reason: InviteAcceptErrorReason;
	  };

async function validateToken(
	token: string | undefined,
): Promise<ValidationResult> {
	if (!token) return { kind: "error", reason: "missingToken" };

	const tokenHash = hashInvitationToken(token);
	const invitation = await db.invitation.findUnique({
		where: { tokenHash },
		select: {
			email: true,
			name: true,
			expiresAt: true,
			acceptedAt: true,
			revokedAt: true,
		},
	});

	if (!invitation) return { kind: "error", reason: "invalid" };
	if (invitation.revokedAt) return { kind: "error", reason: "cancelled" };
	if (invitation.acceptedAt) return { kind: "error", reason: "accepted" };
	if (invitation.expiresAt < new Date()) {
		return { kind: "error", reason: "expired" };
	}

	return {
		kind: "ok",
		token,
		email: invitation.email,
		name: invitation.name,
	};
}
