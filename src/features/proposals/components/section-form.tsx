"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSectionAutosave } from "../hooks/use-section-autosave";

type FieldDef = {
	path: string;
	label: string;
	kind: "text" | "multiline" | "currency" | "date" | "list";
};

export function SectionForm({
	proposalId,
	sectionKey,
	fields,
	initial,
}: {
	proposalId: string;
	sectionKey: string;
	fields: FieldDef[];
	initial: Record<string, unknown>;
}) {
	const { state, lastSavedAt, error, queueSave, retry } = useSectionAutosave({
		proposalId,
		sectionKey,
	});
	const [values, setValues] = useState(initial);

	function setField(key: string, value: unknown) {
		const next = { ...values, [key]: value };
		setValues(next);
		queueSave(next);
	}

	return (
		<div className="space-y-4">
			<div className="text-muted-foreground text-xs">
				{state === "saving" && "Salvando..."}
				{state === "saved" && lastSavedAt && (
					<>Salvo às {lastSavedAt.toLocaleTimeString("pt-BR")}</>
				)}
				{state === "error" && (
					<>
						<span className="text-destructive">Erro: {error}</span>
						<button type="button" onClick={retry} className="ml-2 underline">
							Tentar novamente
						</button>
					</>
				)}
			</div>

			{fields.map((f) => {
				const key = f.path.split(".").slice(-1)[0] ?? f.path;
				const v = values[key] ?? "";
				if (f.kind === "multiline") {
					return (
						<div key={f.path} className="space-y-1">
							<Label>{f.label}</Label>
							<Textarea
								value={String(v)}
								onChange={(e) => setField(key, e.target.value)}
								rows={4}
							/>
						</div>
					);
				}
				return (
					<div key={f.path} className="space-y-1">
						<Label>{f.label}</Label>
						<Input
							value={String(v)}
							onChange={(e) => setField(key, e.target.value)}
						/>
					</div>
				);
			})}
		</div>
	);
}
