"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { ProposalTemplateKey } from "@/generated/prisma/enums";

import { createProposalDraft } from "../actions";
import type { ProspectData } from "../schemas";
import { ClientProspectPicker } from "./client-prospect-picker";
import { TemplatePicker } from "./template-picker";

type Template = {
	key: string;
	name: string;
	category: "CONTINUOUS" | "ONE_OFF";
};

export function NewProposalForm({ templates }: { templates: Template[] }) {
	const router = useRouter();
	const [templateKey, setTemplateKey] = useState<string | null>(null);
	const [mode, setMode] = useState<"client" | "prospect">("client");
	const [clientId, setClientId] = useState<string | null>(null);
	const [prospectData, setProspectData] = useState<ProspectData>({
		type: "PJ",
		legalName: "",
		document: "",
		taxRegime: "SIMPLES_NACIONAL",
	});
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function onSubmit() {
		setError(null);
		if (!templateKey) return setError("Selecione um template.");
		if (mode === "client" && !clientId) {
			return setError("Selecione um cliente.");
		}

		setSubmitting(true);
		const r = await createProposalDraft({
			templateKey: templateKey as ProposalTemplateKey,
			clientId: mode === "client" && clientId ? clientId : undefined,
			prospectData: mode === "prospect" ? prospectData : undefined,
		});
		setSubmitting(false);
		if (!r.success) return setError(r.error);
		router.push(`/admin/proposals/${r.data.proposalId}`);
	}

	return (
		<div className="space-y-8">
			<section className="space-y-3">
				<h2 className="font-semibold text-lg">1. Escolha o template</h2>
				<TemplatePicker
					templates={templates}
					value={templateKey}
					onChange={setTemplateKey}
				/>
			</section>
			<section className="space-y-3">
				<h2 className="font-semibold text-lg">2. Cliente ou prospect</h2>
				<ClientProspectPicker
					mode={mode}
					onModeChange={setMode}
					onClientSelected={setClientId}
					prospectData={prospectData}
					onProspectDataChange={setProspectData}
				/>
			</section>
			{error && <div className="text-destructive text-sm">{error}</div>}
			<Button onClick={onSubmit} disabled={submitting}>
				{submitting ? "Criando..." : "Criar rascunho"}
			</Button>
		</div>
	);
}
