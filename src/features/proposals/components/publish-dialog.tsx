"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { publishProposal } from "../actions";

export function PublishDialog({
	proposalId,
	category,
	open,
	onOpenChange,
	onPublished,
}: {
	proposalId: string;
	category: "CONTINUOUS" | "ONE_OFF";
	open: boolean;
	onOpenChange: (o: boolean) => void;
	onPublished: () => void;
}) {
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [publicUrl, setPublicUrl] = useState<string | null>(null);
	const [mainAmount, setMainAmount] = useState("");
	const [recurringAmount, setRecurringAmount] = useState("");
	const [expiresAt, setExpiresAt] = useState(() => {
		const d = new Date();
		d.setDate(d.getDate() + 7);
		return d.toISOString().slice(0, 10);
	});

	async function onConfirm() {
		setSubmitting(true);
		setError(null);
		const r = await publishProposal({
			proposalId,
			commercial: {
				category,
				mainAmount: mainAmount ? Number(mainAmount) : undefined,
				recurringAmount: recurringAmount ? Number(recurringAmount) : undefined,
				currency: "BRL",
				expiresAt,
			},
		});
		setSubmitting(false);
		if (!r.success) {
			setError(r.error);
			return;
		}
		setPublicUrl(r.data.publicUrl);
		onPublished();
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Publicar proposta</DialogTitle>
					<DialogDescription>
						A proposta será gerada como versão imutável e o link público ficará
						ativo.
					</DialogDescription>
				</DialogHeader>
				{error && (
					<div className="text-destructive text-sm" role="alert">
						{error}
					</div>
				)}
				<div className="grid gap-3">
					<div className="grid gap-1">
						<Label htmlFor="proposal-main-amount">Valor principal</Label>
						<Input
							id="proposal-main-amount"
							inputMode="decimal"
							value={mainAmount}
							onChange={(e) => setMainAmount(e.target.value)}
						/>
					</div>
					<div className="grid gap-1">
						<Label htmlFor="proposal-recurring-amount">Mensalidade</Label>
						<Input
							id="proposal-recurring-amount"
							inputMode="decimal"
							value={recurringAmount}
							onChange={(e) => setRecurringAmount(e.target.value)}
							disabled={category === "ONE_OFF"}
						/>
					</div>
					<div className="grid gap-1">
						<Label htmlFor="proposal-expires-at">Validade</Label>
						<Input
							id="proposal-expires-at"
							type="date"
							value={expiresAt}
							onChange={(e) => setExpiresAt(e.target.value)}
						/>
					</div>
					{publicUrl && (
						<div className="rounded-md border p-3 text-sm">
							<p className="font-medium">Link público gerado</p>
							<a
								href={publicUrl}
								target="_blank"
								rel="noopener"
								className="break-all text-primary underline"
							>
								{publicUrl}
							</a>
						</div>
					)}
				</div>
				<DialogFooter>
					<Button variant="ghost" onClick={() => onOpenChange(false)}>
						{publicUrl ? "Fechar" : "Cancelar"}
					</Button>
					<Button onClick={onConfirm} disabled={submitting}>
						{submitting ? "Publicando..." : "Publicar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
