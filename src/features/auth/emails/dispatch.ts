import "server-only";

import { InviteEmail } from "@/emails/auth/invite";
import { MagicLinkEmail } from "@/emails/auth/magic-link";
import { EMAIL_FROM_ADDRESS, EMAIL_REPLY_TO, resend } from "@/lib/resend";

type SendMagicLinkInput = {
	to: string;
	magicLinkUrl: string;
	recipientName?: string | null;
};

export async function sendMagicLinkEmail(
	input: SendMagicLinkInput,
): Promise<void> {
	const { error } = await resend.emails.send({
		from: EMAIL_FROM_ADDRESS,
		to: input.to,
		replyTo: EMAIL_REPLY_TO,
		subject: "Seu link de acesso ao DuoHub",
		react: MagicLinkEmail({
			magicLinkUrl: input.magicLinkUrl,
			recipientName: input.recipientName,
		}),
	});

	if (error) {
		const message = error.message ?? error.name ?? "unknown";
		throw new Error(`[magic-link email] ${message}`);
	}
}

type SendInviteEmailInput = {
	to: string;
	acceptUrl: string;
	recipientName?: string | null;
	inviterName?: string | null;
};

export async function sendInviteEmail(
	input: SendInviteEmailInput,
): Promise<void> {
	const { error } = await resend.emails.send({
		from: EMAIL_FROM_ADDRESS,
		to: input.to,
		replyTo: EMAIL_REPLY_TO,
		subject: "Você foi convidado para o painel da DuoHub",
		react: InviteEmail({
			acceptUrl: input.acceptUrl,
			recipientName: input.recipientName,
			inviterName: input.inviterName,
		}),
	});

	if (error) {
		const message = error.message ?? error.name ?? "unknown";
		throw new Error(`[invite email] ${message}`);
	}
}
