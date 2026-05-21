import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PromoteProspectBanner } from "@/features/proposals/components/promote-prospect-banner";
import { ProposalActionBar } from "@/features/proposals/components/proposal-action-bar";
import { ProposalEditorShell } from "@/features/proposals/components/proposal-editor-shell";
import { ProposalStatusBadge } from "@/features/proposals/components/status-badge";
import { effectiveStatus } from "@/features/proposals/effective-status";
import { getProposalById } from "@/features/proposals/queries";
import { renderTemplate } from "@/features/proposals/render";
import { buildRenderData } from "@/features/proposals/render-proposal";
import { templateRegistry } from "@/features/proposals/templates";

export const metadata: Metadata = {
	robots: { index: false, follow: false, nocache: true },
};

type FieldDef = {
	path: string;
	label: string;
	kind: "text" | "multiline" | "currency" | "date" | "list";
};

type SectionEntry = {
	key: string;
	label: string;
	fields: FieldDef[];
	initial: Record<string, unknown>;
};

export default async function ProposalEditorPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const proposal = await getProposalById(id);
	if (!proposal) notFound();

	const registered = templateRegistry[proposal.template.key];
	if (!registered) {
		throw new Error(`Template ${proposal.template.key} not in registry`);
	}

	const editableContent =
		(proposal.editableContent as Record<string, unknown> | null) ?? {};
	const commercialData =
		(proposal.commercialData as Record<string, unknown> | null) ?? {};

	const data = buildRenderData({
		client: proposal.client,
		prospectData: proposal.prospectData as Parameters<
			typeof buildRenderData
		>[0]["prospectData"],
		editableContent,
		mainAmount: proposal.mainAmount ? Number(proposal.mainAmount) : null,
		recurringAmount: proposal.recurringAmount
			? Number(proposal.recurringAmount)
			: null,
		currency: proposal.currency,
		commercialData,
		expiresAt: proposal.expiresAt,
	});

	const previewHtml = renderTemplate(
		registered.html,
		data as unknown as Record<string, unknown>,
		registered.metadata,
	);

	const sectionMap = new Map<string, SectionEntry>();
	for (const [path, meta] of Object.entries(registered.metadata)) {
		const sk = meta.section;
		let entry = sectionMap.get(sk);
		if (!entry) {
			entry = {
				key: sk,
				label: sk,
				fields: [],
				initial: (editableContent[sk] as Record<string, unknown>) ?? {},
			};
			sectionMap.set(sk, entry);
		}
		entry.fields.push({ path, label: meta.label, kind: meta.kind });
	}

	return (
		<div className="space-y-4 p-6">
			<header className="flex items-center justify-between">
				<div>
					<h1 className="font-semibold text-xl">
						{proposal.template.name} —{" "}
						{proposal.client?.legalName ?? "Prospect"}
					</h1>
				</div>
				<div className="flex items-center gap-3">
					<ProposalStatusBadge
						status={effectiveStatus(
							{
								status: proposal.status,
								expiresAt: proposal.expiresAt,
							},
							new Date(),
						)}
					/>
					<ProposalActionBar
						proposalId={proposal.id}
						status={proposal.status}
						category={proposal.template.category}
						versionsCount={proposal.publishedVersions.length}
					/>
				</div>
			</header>

			{proposal.status === "ACCEPTED" &&
				proposal.client &&
				proposal.client.status === "PROSPECT" && (
					<PromoteProspectBanner
						clientId={proposal.client.id}
						clientName={proposal.client.legalName}
					/>
				)}

			<ProposalEditorShell
				proposalId={proposal.id}
				sections={Array.from(sectionMap.values())}
				previewHtml={previewHtml}
			/>

			{proposal.publishedVersions.length > 0 && (
				<section className="space-y-2">
					<h2 className="font-semibold text-lg">Versões anteriores</h2>
					<ul className="space-y-1">
						{proposal.publishedVersions.map((v) => (
							<li
								key={v.id}
								className="flex items-center justify-between rounded border p-2"
							>
								<div>
									<strong>v{v.version}</strong> ·{" "}
									{new Intl.DateTimeFormat("pt-BR").format(v.publishedAt)}
								</div>
								<a
									href={`/admin/proposals/${proposal.id}/versions/${v.id}/print?autoprint=1`}
									target="_blank"
									rel="noopener"
									className="text-primary underline"
								>
									Imprimir / Salvar PDF
								</a>
							</li>
						))}
					</ul>
				</section>
			)}
		</div>
	);
}
