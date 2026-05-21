import type { Metadata } from "next";

import { NewProposalForm } from "@/features/proposals/components/new-proposal-form";
import { getActiveTemplates } from "@/features/proposals/queries";

export const metadata: Metadata = {
	title: "Nova proposta — Admin DuoHub",
	robots: { index: false, follow: false, nocache: true },
};

export default async function NewProposalPage() {
	const templates = await getActiveTemplates();
	return (
		<div className="space-y-6 p-6">
			<h1 className="font-semibold text-2xl">Nova proposta</h1>
			<NewProposalForm
				templates={templates.map((t) => ({
					key: t.key,
					name: t.name,
					category: t.category,
				}))}
			/>
		</div>
	);
}
