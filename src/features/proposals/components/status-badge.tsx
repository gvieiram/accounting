import { Badge } from "@/components/ui/badge";
import type { EffectiveStatus } from "../effective-status";

// biome-ignore-start lint/style/useNamingConvention: keys mirror EffectiveStatus enum values
const LABELS: Record<EffectiveStatus, string> = {
	DRAFT: "Rascunho",
	PUBLISHED: "Publicada",
	SENT: "Enviada",
	ACCEPTED: "Aceita",
	DECLINED: "Recusada",
	CANCELLED: "Cancelada",
	EXPIRED: "Expirada",
	EXPIRED_PENDING: "Vencida",
};

const VARIANTS: Record<
	EffectiveStatus,
	"default" | "secondary" | "destructive" | "outline"
> = {
	DRAFT: "outline",
	PUBLISHED: "default",
	SENT: "default",
	ACCEPTED: "default",
	DECLINED: "destructive",
	CANCELLED: "destructive",
	EXPIRED: "secondary",
	EXPIRED_PENDING: "secondary",
};
// biome-ignore-end lint/style/useNamingConvention: keys mirror EffectiveStatus enum values

export function ProposalStatusBadge({ status }: { status: EffectiveStatus }) {
	return <Badge variant={VARIANTS[status]}>{LABELS[status]}</Badge>;
}
