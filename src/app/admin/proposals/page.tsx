import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProposalListTable } from "@/features/proposals/components/proposal-list-table";
import { listProposals } from "@/features/proposals/queries";

export const metadata: Metadata = {
	title: "Propostas — Admin DuoHub",
	robots: { index: false, follow: false, nocache: true },
};

export default async function ProposalsPage() {
	const proposals = await listProposals({});
	return (
		<div className="space-y-6 p-6">
			<div className="flex items-center justify-between">
				<h1 className="font-semibold text-2xl">Propostas</h1>
				<Button asChild>
					<Link href="/admin/proposals/new">Nova proposta</Link>
				</Button>
			</div>
			<ProposalListTable
				rows={proposals.map((p) => ({
					id: p.id,
					template: { name: p.template.name },
					client: p.client,
					prospectData: p.prospectData as Record<string, unknown> | null,
					mainAmount: p.mainAmount ? Number(p.mainAmount) : null,
					recurringAmount: p.recurringAmount ? Number(p.recurringAmount) : null,
					status: p.status,
					expiresAt: p.expiresAt,
					createdAt: p.createdAt,
				}))}
			/>
		</div>
	);
}
