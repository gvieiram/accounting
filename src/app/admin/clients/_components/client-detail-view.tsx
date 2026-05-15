import {
	ArchiveIcon,
	BuildingIcon,
	ChevronRightIcon,
	MailIcon,
	MapPinIcon,
	PencilIcon,
	PhoneIcon,
	UserIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { ArchiveClientButton } from "@/app/admin/clients/_components/archive-client-button";
import { UnarchiveClientButton } from "@/app/admin/clients/_components/unarchive-client-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { messages } from "@/content/messages";
import type { getClient } from "@/features/clients/queries";
import { additionalContactSchema } from "@/features/clients/schemas";
import type { AdditionalContactInput } from "@/features/clients/types";
import {
	formatCep,
	formatDocument,
	formatPhoneBR,
} from "@/features/clients/utils";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";

type ClientRecord = NonNullable<Awaited<ReturnType<typeof getClient>>>;
type BranchRecord = ClientRecord["branches"][number];

type ClientDetailViewProps = {
	client: ClientRecord;
};

export function ClientDetailView({ client }: ClientDetailViewProps) {
	const isPj = client.type === "PJ";

	return (
		<div className="grid gap-6">
			<DetailHeader client={client} />
			<div className="grid gap-4 lg:grid-cols-2">
				<IdentificationCard client={client} />
				<ContactCard client={client} />
				<AddressCard client={client} />
				{isPj ? <BranchesCard client={client} /> : null}
				<AdditionalContactsCard client={client} />
				<NotesCard client={client} />
			</div>
		</div>
	);
}

function DetailHeader({ client }: { client: ClientRecord }) {
	const displayName = client.tradeName || client.legalName;
	const isPj = client.type === "PJ";
	const isBranch = client.parentClientId !== null;
	const activeBranches = client.branches.filter(
		(branch) => branch.archivedAt === null,
	);
	const archivedBranches = client.branches.filter(
		(branch) => branch.archivedAt !== null,
	);
	const isOnActiveShelf = client.archivedAt === null;

	return (
		<header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
			<div className="flex min-w-0 items-start gap-4">
				<div className="grid size-12 shrink-0 place-items-center rounded-lg border bg-muted font-semibold text-base text-muted-foreground">
					{getInitials(displayName)}
				</div>
				<div className="grid min-w-0 gap-1">
					<div className="flex flex-wrap items-center gap-2">
						<h1 className="font-heading text-2xl leading-tight">
							{displayName}
						</h1>
						<StatusBadge status={client.status} />
						{client.archivedAt ? (
							<Badge variant="outline">
								{messages.admin.clients.kpis.archived}
							</Badge>
						) : null}
					</div>
					<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-sm">
						{client.tradeName ? (
							<span className="truncate">{client.legalName}</span>
						) : null}
						<span className="font-mono text-xs">
							{formatDocument(client.type, client.document)}
						</span>
						<HierarchyChip
							isBranch={isBranch}
							isPj={isPj}
							branchCount={activeBranches.length}
						/>
					</div>
				</div>
			</div>
			<div className="flex shrink-0 items-center gap-2">
				{isOnActiveShelf ? (
					<ArchiveClientButton
						clientId={client.id}
						branchCount={activeBranches.length}
					/>
				) : (
					<UnarchiveClientButton
						clientId={client.id}
						archivedBranchCount={archivedBranches.length}
					/>
				)}
				<Button asChild variant="default">
					<Link href={`/admin/clients/${client.id}?edit=1`} scroll={false}>
						<PencilIcon aria-hidden="true" className="size-4" />
						{messages.common.actions.edit}
					</Link>
				</Button>
			</div>
		</header>
	);
}

function IdentificationCard({ client }: { client: ClientRecord }) {
	const labels = messages.admin.clients.detail;
	const enums = messages.admin.enums;
	const isPj = client.type === "PJ";

	return (
		<DetailCard
			title={labels.sections.identification}
			icon={<BuildingIcon className="size-4" aria-hidden />}
		>
			<DataRow
				label={labels.labels.type}
				value={enums.clientType[client.type]}
			/>
			<DataRow label={labels.labels.legalName} value={client.legalName} />
			{client.tradeName ? (
				<DataRow label={labels.labels.tradeName} value={client.tradeName} />
			) : null}
			<DataRow
				label={labels.labels.document}
				value={formatDocument(client.type, client.document)}
				mono
			/>
			{isPj ? <PjExtraRows client={client} /> : null}
			<DataRow
				label={labels.labels.createdAt}
				value={formatDate(client.createdAt)}
			/>
		</DetailCard>
	);
}

function PjExtraRows({ client }: { client: ClientRecord }) {
	const labels = messages.admin.clients.detail;
	const enums = messages.admin.enums;
	return (
		<>
			<DataRow
				label={labels.labels.taxRegime}
				value={client.taxRegime ? enums.taxRegime[client.taxRegime] : undefined}
			/>
			<DataRow
				label={labels.labels.segment}
				value={client.segment ?? undefined}
			/>
			<DataRow
				label={labels.labels.stateRegistration}
				value={client.stateRegistration ?? undefined}
			/>
			<DataRow
				label={labels.labels.cityRegistration}
				value={client.cityRegistration ?? undefined}
			/>
		</>
	);
}

function ContactCard({ client }: { client: ClientRecord }) {
	const labels = messages.admin.clients.detail;
	return (
		<DetailCard
			title={labels.sections.contact}
			icon={<UserIcon className="size-4" aria-hidden />}
		>
			<DataRow label={labels.labels.contactName} value={client.contactName} />
			<DataRow
				label={labels.labels.email}
				value={client.primaryEmail}
				icon={<MailIcon className="size-3.5" aria-hidden />}
			/>
			<DataRow
				label={labels.labels.phone}
				value={formatPhoneBR(client.primaryPhone)}
				icon={<PhoneIcon className="size-3.5" aria-hidden />}
			/>
		</DetailCard>
	);
}

function AddressCard({ client }: { client: ClientRecord }) {
	const labels = messages.admin.clients.detail;
	return (
		<DetailCard
			title={labels.sections.address}
			icon={<MapPinIcon className="size-4" aria-hidden />}
			className="lg:col-span-2"
		>
			{hasAddress(client) ? (
				<div className="grid gap-1 text-sm">
					<span>
						{[client.street, client.number, client.complement]
							.filter(Boolean)
							.join(", ")}
					</span>
					<span className="text-muted-foreground">
						{[client.neighborhood, client.city, client.state]
							.filter(Boolean)
							.join(" · ")}
					</span>
					{client.zipCode ? (
						<span className="font-mono text-muted-foreground text-xs">
							{formatCep(client.zipCode)}
						</span>
					) : null}
				</div>
			) : (
				<EmptyValue label={labels.empty.address} />
			)}
		</DetailCard>
	);
}

function BranchesCard({ client }: { client: ClientRecord }) {
	const labels = messages.admin.clients.detail;
	return (
		<DetailCard
			title={labels.sections.branches}
			icon={<ChevronRightIcon className="size-4" aria-hidden />}
			className="lg:col-span-2"
			headerExtra={
				client.parentClient ? (
					<Badge variant="outline">
						{labels.labels.parent}:{" "}
						{client.parentClient.tradeName || client.parentClient.legalName}
					</Badge>
				) : null
			}
		>
			{client.branches.length === 0 ? (
				<EmptyValue label={labels.empty.branches} />
			) : (
				<ul className="grid gap-1">
					{client.branches.map((branch) => (
						<BranchRow key={branch.id} branch={branch} />
					))}
				</ul>
			)}
		</DetailCard>
	);
}

function AdditionalContactsCard({ client }: { client: ClientRecord }) {
	const labels = messages.admin.clients.detail;
	const additionalContacts = parseAdditionalContacts(client.additionalContacts);

	return (
		<DetailCard
			title={labels.sections.additionalContacts}
			icon={<UserIcon className="size-4" aria-hidden />}
			className="lg:col-span-2"
		>
			{additionalContacts.length === 0 ? (
				<EmptyValue label={labels.empty.additionalContacts} />
			) : (
				<ul className="grid gap-2">
					{additionalContacts.map((contact) => (
						<li
							key={contactKey(contact)}
							className="grid gap-0.5 rounded-md border bg-muted/20 p-3 text-sm"
						>
							<div className="flex flex-wrap items-center gap-2">
								<span className="font-medium">{contact.name}</span>
								{contact.role ? (
									<Badge variant="outline">{contact.role}</Badge>
								) : null}
							</div>
							<span className="text-muted-foreground text-xs">
								{contact.email} · {formatPhoneBR(contact.phone)}
							</span>
						</li>
					))}
				</ul>
			)}
		</DetailCard>
	);
}

function NotesCard({ client }: { client: ClientRecord }) {
	const labels = messages.admin.clients.detail;
	return (
		<DetailCard
			title={labels.sections.notes}
			icon={<ArchiveIcon className="size-4" aria-hidden />}
			className="lg:col-span-2"
		>
			{client.internalNotes ? (
				<p className="whitespace-pre-wrap text-sm">{client.internalNotes}</p>
			) : (
				<EmptyValue label={labels.empty.notes} />
			)}
		</DetailCard>
	);
}

function contactKey(contact: AdditionalContactInput): string {
	return `${contact.email}::${contact.phone}::${contact.name}`;
}

function DetailCard({
	title,
	icon,
	headerExtra,
	className,
	children,
}: {
	title: string;
	icon: ReactNode;
	headerExtra?: ReactNode;
	className?: string;
	children: ReactNode;
}) {
	return (
		<Card className={cn("border-border", className)}>
			<CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
				<CardTitle className="flex items-center gap-2 font-medium text-sm">
					<span className="text-muted-foreground">{icon}</span>
					{title}
				</CardTitle>
				{headerExtra}
			</CardHeader>
			<CardContent className="grid gap-2">{children}</CardContent>
		</Card>
	);
}

function DataRow({
	label,
	value,
	icon,
	mono,
}: {
	label: string;
	value: string | undefined;
	icon?: ReactNode;
	mono?: boolean;
}) {
	return (
		<div className="grid grid-cols-[10rem_minmax(0,1fr)] items-baseline gap-3 text-sm">
			<dt className="text-muted-foreground">{label}</dt>
			<dd
				className={cn(
					"inline-flex min-w-0 items-center gap-1.5 truncate",
					mono && "font-mono text-xs",
				)}
			>
				{icon ? <span className="text-muted-foreground">{icon}</span> : null}
				{value ? (
					<span className="truncate">{value}</span>
				) : (
					<span className="text-muted-foreground">
						{messages.common.terms.notInformed}
					</span>
				)}
			</dd>
		</div>
	);
}

function EmptyValue({ label }: { label: string }) {
	return <p className="text-muted-foreground text-sm">{label}</p>;
}

function BranchRow({ branch }: { branch: BranchRecord }) {
	const isArchived = branch.archivedAt !== null;
	const name = branch.tradeName || branch.legalName;
	return (
		<li>
			<Link
				href={`/admin/clients/${branch.id}`}
				className={cn(
					"flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-sm transition-colors hover:border-foreground/20 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
					isArchived && "opacity-60",
				)}
			>
				<div className="flex min-w-0 items-center gap-2">
					<ChevronRightIcon
						aria-hidden="true"
						className="size-3.5 text-muted-foreground"
					/>
					<span className="truncate font-medium">{name}</span>
					<span className="font-mono text-muted-foreground text-xs">
						{formatDocument(branch.type, branch.document)}
					</span>
				</div>
				<StatusBadge status={branch.status} />
			</Link>
		</li>
	);
}

function StatusBadge({
	status,
}: {
	status: "ACTIVE" | "PROSPECT" | "INACTIVE" | "CHURNED";
}) {
	const variant: "default" | "secondary" | "outline" =
		status === "ACTIVE"
			? "default"
			: status === "PROSPECT"
				? "secondary"
				: "outline";
	return (
		<Badge variant={variant}>{messages.admin.enums.clientStatus[status]}</Badge>
	);
}

function HierarchyChip({
	isBranch,
	isPj,
	branchCount,
}: {
	isBranch: boolean;
	isPj: boolean;
	branchCount: number;
}) {
	if (isBranch) {
		return <Badge variant="outline">{messages.common.terms.filial}</Badge>;
	}
	if (isPj && branchCount > 0) {
		return (
			<Badge variant="outline">
				{messages.admin.clients.matrizWithBranches(branchCount)}
			</Badge>
		);
	}
	if (isPj) {
		return <Badge variant="outline">{messages.common.terms.matriz}</Badge>;
	}
	return null;
}

function getInitials(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "?";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hasAddress(client: ClientRecord): boolean {
	return Boolean(
		client.street ||
			client.number ||
			client.neighborhood ||
			client.city ||
			client.state ||
			client.zipCode,
	);
}

function parseAdditionalContacts(value: unknown): AdditionalContactInput[] {
	const result = additionalContactSchema.array().safeParse(value ?? []);
	return result.success ? result.data : [];
}
