"use client";

import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { ProspectData } from "../schemas";

type Mode = "client" | "prospect";
type Match = { id: string; legalName: string; status: string };

async function lookup(doc: string): Promise<Match | null> {
	const r = await fetch("/api/admin/proposals/lookup-client", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ document: doc }),
	});
	if (!r.ok) return null;
	return r.json();
}

export function ClientProspectPicker({
	mode,
	onModeChange,
	onClientSelected,
	prospectData,
	onProspectDataChange,
}: {
	mode: Mode;
	onModeChange: (m: Mode) => void;
	onClientSelected: (id: string | null) => void;
	prospectData: ProspectData;
	onProspectDataChange: (data: ProspectData) => void;
}) {
	const [doc, setDoc] = useState("");
	const [match, setMatch] = useState<Match | null>(null);

	useEffect(() => {
		const normalized = doc.replace(/\D/g, "");
		if (normalized.length < 11) {
			setMatch(null);
			return;
		}
		const t = setTimeout(async () => setMatch(await lookup(normalized)), 500);
		return () => clearTimeout(t);
	}, [doc]);

	function update(field: string, value: string) {
		onProspectDataChange({ ...prospectData, [field]: value } as ProspectData);
	}

	return (
		<div className="space-y-4">
			<div className="flex gap-2">
				<button
					type="button"
					className={mode === "client" ? "font-bold" : ""}
					onClick={() => onModeChange("client")}
				>
					Cliente existente
				</button>
				<button
					type="button"
					className={mode === "prospect" ? "font-bold" : ""}
					onClick={() => onModeChange("prospect")}
				>
					Novo prospect
				</button>
			</div>

			<div className="space-y-2">
				<Label>CPF / CNPJ</Label>
				<Input
					value={doc}
					onChange={(e) => {
						setDoc(e.target.value);
						update("document", e.target.value.replace(/\D/g, ""));
					}}
				/>
				{match && (
					<div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm">
						Encontramos cliente com este documento:{" "}
						<strong>{match.legalName}</strong> ({match.status}).
						<button
							type="button"
							className="ml-2 text-primary underline"
							onClick={() => {
								onClientSelected(match.id);
								onModeChange("client");
							}}
						>
							Usar este cliente
						</button>
					</div>
				)}
			</div>

			{mode === "prospect" && (
				<div className="grid gap-3 md:grid-cols-2">
					<div className="space-y-1">
						<Label>Tipo</Label>
						<select
							value={prospectData.type}
							onChange={(e) => {
								const type = e.target.value as "PF" | "PJ";
								onProspectDataChange(
									type === "PF"
										? { type, name: "", document: prospectData.document }
										: {
												type,
												legalName: "",
												document: prospectData.document,
												taxRegime: "SIMPLES_NACIONAL",
											},
								);
							}}
							className="h-10 rounded-md border bg-background px-3 text-sm"
						>
							<option value="PF">Pessoa física</option>
							<option value="PJ">Pessoa jurídica</option>
						</select>
					</div>
					<div className="space-y-1">
						<Label>
							{prospectData.type === "PF" ? "Nome" : "Razão social"}
						</Label>
						<Input
							value={
								prospectData.type === "PF"
									? prospectData.name
									: prospectData.legalName
							}
							onChange={(e) =>
								update(
									prospectData.type === "PF" ? "name" : "legalName",
									e.target.value,
								)
							}
						/>
					</div>
					{prospectData.type === "PJ" && (
						<div className="space-y-1">
							<Label>Regime tributário</Label>
							<select
								value={prospectData.taxRegime}
								onChange={(e) => update("taxRegime", e.target.value)}
								className="h-10 rounded-md border bg-background px-3 text-sm"
							>
								<option value="MEI">MEI</option>
								<option value="SIMPLES_NACIONAL">Simples Nacional</option>
								<option value="LUCRO_PRESUMIDO">Lucro Presumido</option>
								<option value="LUCRO_REAL">Lucro Real</option>
							</select>
						</div>
					)}
					<div className="space-y-1">
						<Label>Email</Label>
						<Input
							value={prospectData.email ?? ""}
							onChange={(e) => update("email", e.target.value)}
						/>
					</div>
					<div className="space-y-1">
						<Label>Telefone</Label>
						<Input
							value={prospectData.phone ?? ""}
							onChange={(e) => update("phone", e.target.value)}
						/>
					</div>
				</div>
			)}
		</div>
	);
}
