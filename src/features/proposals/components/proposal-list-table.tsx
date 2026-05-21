import Link from "next/link";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { ProposalStatus } from "@/generated/prisma/enums";
import { effectiveStatus } from "../effective-status";
import { ProposalStatusBadge } from "./status-badge";

type ProposalRow = {
	id: string;
	template: { name: string };
	client: { legalName: string; document: string } | null;
	prospectData: Record<string, unknown> | null;
	mainAmount: number | null;
	recurringAmount: number | null;
	status: ProposalStatus;
	expiresAt: Date | null;
	createdAt: Date;
};

const fmtBRL = (v: number | null) =>
	v === null
		? "—"
		: new Intl.NumberFormat("pt-BR", {
				style: "currency",
				currency: "BRL",
			}).format(v);

const fmtDate = (v: Date | null) =>
	v ? new Intl.DateTimeFormat("pt-BR").format(v) : "—";

function clientLabel(row: ProposalRow): string {
	if (row.client) return row.client.legalName;
	if (row.prospectData) {
		const p = row.prospectData as { name?: string; legalName?: string };
		return p.legalName ?? p.name ?? "Prospect";
	}
	return "—";
}

export function ProposalListTable({ rows }: { rows: ProposalRow[] }) {
	const now = new Date();
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Cliente / Prospect</TableHead>
					<TableHead>Template</TableHead>
					<TableHead>Valor principal</TableHead>
					<TableHead>Mensalidade</TableHead>
					<TableHead>Status</TableHead>
					<TableHead>Validade</TableHead>
					<TableHead>Criado em</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{rows.map((row) => (
					<TableRow key={row.id}>
						<TableCell>
							<Link
								href={`/admin/proposals/${row.id}`}
								className="hover:underline"
							>
								{clientLabel(row)}
							</Link>
						</TableCell>
						<TableCell>{row.template.name}</TableCell>
						<TableCell>{fmtBRL(row.mainAmount)}</TableCell>
						<TableCell>{fmtBRL(row.recurringAmount)}</TableCell>
						<TableCell>
							<ProposalStatusBadge
								status={effectiveStatus(
									{ status: row.status, expiresAt: row.expiresAt },
									now,
								)}
							/>
						</TableCell>
						<TableCell>{fmtDate(row.expiresAt)}</TableCell>
						<TableCell>{fmtDate(row.createdAt)}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
