import type { ProposalStatus } from "@/generated/prisma/enums";

export type EffectiveStatus = ProposalStatus | "EXPIRED_PENDING";

const TERMINAL: ProposalStatus[] = [
	"ACCEPTED",
	"DECLINED",
	"CANCELLED",
	"EXPIRED",
];
const EXPIRABLE: ProposalStatus[] = ["PUBLISHED", "SENT"];

export function effectiveStatus(
	p: { status: ProposalStatus; expiresAt: Date | null },
	now: Date = new Date(),
): EffectiveStatus {
	if (TERMINAL.includes(p.status)) return p.status;
	if (!EXPIRABLE.includes(p.status)) return p.status;
	if (p.expiresAt && p.expiresAt <= now) return "EXPIRED_PENDING";
	return p.status;
}
