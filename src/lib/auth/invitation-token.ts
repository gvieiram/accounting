import "server-only";

import { createHash, randomBytes } from "node:crypto";

const TOKEN_BYTES = 32;

export type GeneratedInvitationToken = {
	raw: string;
	hash: string;
};

export function generateInvitationToken(): GeneratedInvitationToken {
	const raw = randomBytes(TOKEN_BYTES).toString("base64url");
	return { raw, hash: hashInvitationToken(raw) };
}

export function hashInvitationToken(raw: string): string {
	return createHash("sha256").update(raw).digest("hex");
}

export const INVITATION_TTL_SECONDS = 60 * 60 * 24;

export function invitationExpiresAt(now: Date = new Date()): Date {
	return new Date(now.getTime() + INVITATION_TTL_SECONDS * 1000);
}
