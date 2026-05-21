"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { promoteProspectToActive } from "../actions";

export function PromoteProspectBanner({
	clientId,
	clientName,
}: {
	clientId: string;
	clientName: string;
}) {
	const [submitting, setSubmitting] = useState(false);
	const [hidden, setHidden] = useState(false);
	if (hidden) return null;

	async function onPromote() {
		setSubmitting(true);
		const r = await promoteProspectToActive({ clientId });
		setSubmitting(false);
		if (r.success) {
			setHidden(true);
			window.location.reload();
		} else {
			alert(r.error);
		}
	}

	return (
		<div className="rounded-md border border-yellow-300 bg-yellow-50 p-4">
			<p className="text-sm">
				Proposta aceita! Promover <strong>{clientName}</strong> para cliente
				ativo?
			</p>
			<div className="mt-2 flex gap-2">
				<Button onClick={onPromote} disabled={submitting}>
					{submitting ? "Promovendo..." : "Promover"}
				</Button>
				<Button variant="ghost" onClick={() => setHidden(true)}>
					Depois
				</Button>
			</div>
		</div>
	);
}
