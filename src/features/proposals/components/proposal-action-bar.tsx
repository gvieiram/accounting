"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	acceptProposal,
	cancelProposal,
	declineProposal,
	markProposalSent,
	rotateToken,
} from "../actions";
import { PublishDialog } from "./publish-dialog";

export function ProposalActionBar({
	proposalId,
	status,
	category,
	versionsCount,
}: {
	proposalId: string;
	status: string;
	category: "CONTINUOUS" | "ONE_OFF";
	versionsCount: number;
}) {
	const [publishOpen, setPublishOpen] = useState(false);
	const [busy, setBusy] = useState(false);

	async function call(
		fn: () => Promise<{
			success: boolean;
			error?: string;
			data?: { publicUrl?: string };
		}>,
	) {
		setBusy(true);
		const r = await fn();
		setBusy(false);
		if (!r.success) {
			alert(r.error);
		} else if (r.data?.publicUrl) {
			alert(`Novo link público: ${r.data.publicUrl}`);
		} else {
			window.location.reload();
		}
	}

	return (
		<div className="flex flex-wrap gap-2">
			{status === "DRAFT" && (
				<Button onClick={() => setPublishOpen(true)}>Publicar</Button>
			)}
			{versionsCount > 0 && (
				<a
					href={`/admin/proposals/${proposalId}/print?autoprint=1`}
					target="_blank"
					rel="noopener"
				>
					<Button variant="outline">Imprimir / Salvar PDF</Button>
				</a>
			)}
			{status === "PUBLISHED" && (
				<Button
					variant="outline"
					disabled={busy}
					onClick={() => call(() => markProposalSent({ proposalId }))}
				>
					Marcar enviada
				</Button>
			)}
			{status === "SENT" && (
				<>
					<Button
						variant="outline"
						disabled={busy}
						onClick={() => call(() => acceptProposal({ proposalId }))}
					>
						Aceitar
					</Button>
					<Button
						variant="outline"
						disabled={busy}
						onClick={() => call(() => declineProposal({ proposalId }))}
					>
						Recusar
					</Button>
				</>
			)}
			{(status === "PUBLISHED" || status === "SENT") && (
				<Button
					variant="outline"
					disabled={busy}
					onClick={() => call(() => rotateToken({ proposalId }))}
				>
					Renovar token
				</Button>
			)}
			{status !== "CANCELLED" &&
				status !== "ACCEPTED" &&
				status !== "DECLINED" && (
					<Button
						variant="destructive"
						disabled={busy}
						onClick={() => {
							if (confirm("Cancelar proposta?")) {
								call(() => cancelProposal({ proposalId }));
							}
						}}
					>
						Cancelar
					</Button>
				)}
			<PublishDialog
				proposalId={proposalId}
				category={category}
				open={publishOpen}
				onOpenChange={setPublishOpen}
				onPublished={() => window.location.reload()}
			/>
		</div>
	);
}
