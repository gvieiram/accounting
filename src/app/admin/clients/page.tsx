import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { messages } from "@/content/messages";
import { CLIENT_STATUSES, CLIENT_TYPES } from "@/features/clients/constants";
import { countClientsByStatus, listClients } from "@/features/clients/queries";
import type { ClientListFilters } from "@/features/clients/types";
import type { ClientStatus, ClientType } from "@/generated/prisma/enums";
import { requireAdmin } from "@/lib/auth/helpers";
import { ClientsFilters } from "./_components/clients-filters";
import { ClientsKpiStrip } from "./_components/clients-kpi-strip";
import { ClientsTable } from "./_components/clients-table";
import { NewClientSheetTrigger } from "./_components/new-client-sheet-trigger";

export const metadata: Metadata = {
	title: "Admin - Clientes",
};

type SearchParams = Promise<{
	q?: string;
	type?: string;
	status?: string;
	archived?: string;
	new?: string;
}>;

export default async function ClientsPage({
	searchParams,
}: {
	searchParams: SearchParams;
}) {
	await requireAdmin();
	const sp = await searchParams;
	const filters: ClientListFilters = {
		q: sp.q?.trim() || undefined,
		type: CLIENT_TYPES.includes(sp.type as ClientType)
			? (sp.type as ClientType)
			: undefined,
		status: CLIENT_STATUSES.includes(sp.status as ClientStatus)
			? (sp.status as ClientStatus)
			: undefined,
		archived: sp.archived === "1",
	};
	const [clients, counts] = await Promise.all([
		listClients(filters),
		countClientsByStatus(),
	]);
	const hasFilters = Boolean(
		filters.q || filters.type || filters.status || filters.archived,
	);
	const { admin } = messages;

	return (
		<>
			<header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div className="flex flex-col gap-1">
					<h1 className="font-heading text-3xl">{admin.clients.title}</h1>
					<p className="text-muted-foreground">{admin.clients.subtitle}</p>
				</div>
				<Button asChild>
					<Link href="/admin/clients?new=1" scroll={false}>
						<PlusIcon aria-hidden="true" className="size-4" />
						{admin.clients.new}
					</Link>
				</Button>
			</header>
			<ClientsKpiStrip counts={counts} filters={filters} />
			<ClientsFilters />
			<ClientsTable clients={clients} hasFilters={hasFilters} />
			<NewClientSheetTrigger />
		</>
	);
}
