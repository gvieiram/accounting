import Link from "next/link";

import { messages } from "@/content/messages";
import { buildKpiHref } from "@/features/clients/list-utils";
import type { ClientStatusCounts } from "@/features/clients/queries";
import type { ClientListFilters } from "@/features/clients/types";
import { cn } from "@/lib/utils";

type ClientsKpiStripProps = {
	counts: ClientStatusCounts;
	filters: ClientListFilters;
};

type Kpi = {
	key: string;
	label: string;
	value: number;
	href: string;
	active: boolean;
	tone: "neutral" | "accent" | "warning" | "muted";
};

const TONE_CLASSES: Record<Kpi["tone"], string> = {
	neutral:
		"data-[active=true]:border-primary data-[active=true]:bg-primary/5 data-[active=true]:ring-1 data-[active=true]:ring-primary/20",
	accent:
		"data-[active=true]:border-accent data-[active=true]:bg-accent/10 data-[active=true]:ring-1 data-[active=true]:ring-accent/20",
	warning:
		"data-[active=true]:border-amber-500 data-[active=true]:bg-amber-500/5 data-[active=true]:ring-1 data-[active=true]:ring-amber-500/20",
	muted: "data-[active=true]:border-foreground/40 data-[active=true]:bg-muted",
};

export function ClientsKpiStrip({ counts, filters }: ClientsKpiStripProps) {
	const labels = messages.admin.clients.kpis;
	const isArchived = filters.archived === true;
	const status = isArchived ? undefined : filters.status;

	const kpis: Kpi[] = [
		{
			key: "active",
			label: labels.active,
			value: counts.active,
			href: buildKpiHref("ACTIVE", false, status === "ACTIVE" && !isArchived),
			active: status === "ACTIVE" && !isArchived,
			tone: "neutral",
		},
		{
			key: "prospect",
			label: labels.prospect,
			value: counts.prospect,
			href: buildKpiHref(
				"PROSPECT",
				false,
				status === "PROSPECT" && !isArchived,
			),
			active: status === "PROSPECT" && !isArchived,
			tone: "accent",
		},
		{
			key: "inactive",
			label: labels.inactive,
			value: counts.inactive,
			href: buildKpiHref(
				"INACTIVE",
				false,
				status === "INACTIVE" && !isArchived,
			),
			active: status === "INACTIVE" && !isArchived,
			tone: "warning",
		},
		{
			key: "archived",
			label: labels.archived,
			value: counts.archived,
			href: buildKpiHref(undefined, true, isArchived),
			active: isArchived,
			tone: "muted",
		},
	];

	return (
		<div
			className="grid grid-cols-2 gap-3 lg:grid-cols-4"
			data-slot="clients-kpi-strip"
		>
			{kpis.map((kpi) => (
				<Link
					key={kpi.key}
					href={kpi.href}
					prefetch={false}
					aria-label={labels.filterAria(kpi.label)}
					aria-pressed={kpi.active}
					data-active={kpi.active}
					scroll={false}
					className={cn(
						"group flex flex-col gap-1 rounded-lg border bg-background px-4 py-3 transition-all duration-150",
						"hover:border-foreground/20 hover:bg-muted/30",
						"focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
						TONE_CLASSES[kpi.tone],
					)}
				>
					<span className="text-muted-foreground text-xs uppercase tracking-wide">
						{kpi.label}
					</span>
					<span className="font-semibold text-2xl tabular-nums leading-none">
						{kpi.value}
					</span>
				</Link>
			))}
		</div>
	);
}
