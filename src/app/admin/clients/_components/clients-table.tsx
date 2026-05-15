"use client";

import {
	ChevronRightIcon,
	CornerDownRightIcon,
	EllipsisIcon,
	EyeIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { orderClients } from "@/features/clients/list-utils";
import type { ClientListItem } from "@/features/clients/queries";
import { formatDocument } from "@/features/clients/utils";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import { useMessages } from "@/stores/use-content-store";
import { ArchiveClientButton } from "./archive-client-button";

type ClientsTableProps = {
	clients: ClientListItem[];
	hasFilters: boolean;
};

export function ClientsTable({ clients, hasFilters }: ClientsTableProps) {
	const messages = useMessages();
	const labels = messages.admin.clients;
	const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

	const orderedClients = useMemo(() => orderClients(clients), [clients]);

	const visibleClients = useMemo(
		() =>
			orderedClients.filter((client) => {
				if (client.parentClientId === null) return true;
				return !collapsed.has(client.parentClientId);
			}),
		[orderedClients, collapsed],
	);

	const toggleMatriz = useCallback((matrizId: string) => {
		setCollapsed((previous) => {
			const next = new Set(previous);
			if (next.has(matrizId)) next.delete(matrizId);
			else next.add(matrizId);
			return next;
		});
	}, []);

	if (clients.length === 0) {
		return (
			<EmptyState
				title={hasFilters ? labels.emptyForFilter.noMatch : labels.empty.title}
				description={hasFilters ? "" : labels.empty.description}
				showClearFilters={hasFilters}
			/>
		);
	}

	return (
		<>
			<div className="hidden overflow-hidden rounded-lg border bg-background md:block">
				<Table>
					<TableHeader>
						<TableRow className="hover:bg-transparent">
							<TableHead>{labels.columns.client}</TableHead>
							<TableHead className="hidden whitespace-nowrap md:table-cell">
								{labels.columns.document}
							</TableHead>
							<TableHead className="whitespace-nowrap">
								{labels.columns.type}
							</TableHead>
							<TableHead className="hidden whitespace-nowrap lg:table-cell">
								{labels.columns.regime}
							</TableHead>
							<TableHead className="whitespace-nowrap">
								{labels.columns.status}
							</TableHead>
							<TableHead className="hidden whitespace-nowrap xl:table-cell">
								{labels.columns.createdAt}
							</TableHead>
							<TableHead className="w-10">
								<span className="sr-only">{labels.columns.actions}</span>
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{visibleClients.map((client) => (
							<ClientTableRow
								key={client.id}
								client={client}
								collapsed={collapsed}
								onToggleMatriz={toggleMatriz}
							/>
						))}
					</TableBody>
				</Table>
			</div>
			<ul className="grid gap-2 md:hidden">
				{visibleClients.map((client) => (
					<ClientCard
						key={client.id}
						client={client}
						collapsed={collapsed}
						onToggleMatriz={toggleMatriz}
					/>
				))}
			</ul>
		</>
	);
}

type ClientTableRowProps = {
	client: ClientListItem;
	collapsed: Set<string>;
	onToggleMatriz: (matrizId: string) => void;
};

function ClientTableRow({
	client,
	collapsed,
	onToggleMatriz,
}: ClientTableRowProps) {
	const router = useRouter();
	const messages = useMessages();
	const labels = messages.admin.clients;

	const isBranch = client.parentClientId !== null;
	const isMatrizWithBranches = !isBranch && client.activeBranchesCount > 0;
	const isExpanded = isMatrizWithBranches && !collapsed.has(client.id);

	function handleRowActivate() {
		router.push(`/admin/clients/${client.id}`);
	}

	return (
		<TableRow
			className={cn(
				"group cursor-pointer transition-colors",
				isBranch && "bg-muted/20",
			)}
			onClick={(event) => {
				if (
					(event.target as HTMLElement).closest(
						'button, a, [role="menuitem"], input',
					)
				) {
					return;
				}
				handleRowActivate();
			}}
			onKeyDown={(event) => {
				if (event.target !== event.currentTarget) return;
				if (event.key === "Enter") {
					event.preventDefault();
					handleRowActivate();
				}
			}}
			tabIndex={0}
			aria-label={`${labels.viewDetails}: ${
				client.tradeName || client.legalName
			}`}
		>
			<TableCell>
				<div className="flex min-w-0 items-start gap-2">
					{isMatrizWithBranches ? (
						<button
							type="button"
							className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-transform hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							aria-label={
								isExpanded
									? messages.common.a11y.collapseGroup
									: messages.common.a11y.expandGroup
							}
							aria-expanded={isExpanded}
							onClick={(event) => {
								event.stopPropagation();
								onToggleMatriz(client.id);
							}}
						>
							<ChevronRightIcon
								aria-hidden="true"
								className={cn(
									"size-4 transition-transform duration-150",
									isExpanded && "rotate-90",
								)}
							/>
						</button>
					) : isBranch ? (
						<CornerDownRightIcon
							aria-hidden="true"
							className="mt-1 size-3.5 shrink-0 text-muted-foreground"
						/>
					) : (
						<span className="inline-block w-5 shrink-0" aria-hidden />
					)}
					<div className="grid min-w-0 gap-0.5">
						<div className="flex min-w-0 items-center gap-2">
							<span className="truncate font-medium">
								{client.tradeName || client.legalName}
							</span>
							<HierarchyBadge
								isBranch={isBranch}
								isMatrizWithBranches={isMatrizWithBranches}
								isPj={client.type === "PJ"}
								branchCount={client.activeBranchesCount}
							/>
						</div>
						{client.tradeName ? (
							<span className="truncate text-muted-foreground text-xs">
								{client.legalName}
							</span>
						) : null}
						<span className="text-muted-foreground text-xs md:hidden">
							{formatDocument(client.type, client.document)}
						</span>
					</div>
				</div>
			</TableCell>
			<TableCell className="hidden whitespace-nowrap font-mono text-xs md:table-cell">
				{formatDocument(client.type, client.document)}
			</TableCell>
			<TableCell className="whitespace-nowrap">
				<Badge variant="secondary">
					{messages.admin.enums.clientType[client.type]}
				</Badge>
			</TableCell>
			<TableCell className="hidden whitespace-nowrap lg:table-cell">
				{client.taxRegime ? (
					messages.admin.enums.taxRegime[client.taxRegime]
				) : (
					<span className="text-muted-foreground">
						{messages.common.terms.notInformed}
					</span>
				)}
			</TableCell>
			<TableCell className="whitespace-nowrap">
				<StatusBadge status={client.status} />
			</TableCell>
			<TableCell className="hidden whitespace-nowrap tabular-nums xl:table-cell">
				{formatDate(client.createdAt)}
			</TableCell>
			<TableCell>
				<RowActions
					clientId={client.id}
					branchCount={client.activeBranchesCount}
					viewLabel={labels.viewDetails}
					editLabel={labels.edit}
				/>
			</TableCell>
		</TableRow>
	);
}

function ClientCard({
	client,
	collapsed,
	onToggleMatriz,
}: ClientTableRowProps) {
	const messages = useMessages();
	const labels = messages.admin.clients;

	const isBranch = client.parentClientId !== null;
	const isMatrizWithBranches = !isBranch && client.activeBranchesCount > 0;
	const isExpanded = isMatrizWithBranches && !collapsed.has(client.id);

	return (
		<li
			className={cn(
				"group relative rounded-lg border bg-background transition-colors hover:border-foreground/20",
				isBranch && "ml-4 border-dashed bg-muted/20",
			)}
		>
			<Link
				href={`/admin/clients/${client.id}`}
				className="absolute inset-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
				aria-label={`${labels.viewDetails}: ${
					client.tradeName || client.legalName
				}`}
			>
				<span className="sr-only">{labels.viewDetails}</span>
			</Link>
			<div className="pointer-events-none relative flex items-start gap-3 p-3">
				<div className="pointer-events-auto">
					{isMatrizWithBranches ? (
						<button
							type="button"
							className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-transform hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							aria-label={
								isExpanded
									? messages.common.a11y.collapseGroup
									: messages.common.a11y.expandGroup
							}
							aria-expanded={isExpanded}
							onClick={(event) => {
								event.preventDefault();
								event.stopPropagation();
								onToggleMatriz(client.id);
							}}
						>
							<ChevronRightIcon
								aria-hidden="true"
								className={cn(
									"size-4 transition-transform duration-150",
									isExpanded && "rotate-90",
								)}
							/>
						</button>
					) : isBranch ? (
						<CornerDownRightIcon
							aria-hidden="true"
							className="mt-1.5 size-4 shrink-0 text-muted-foreground"
						/>
					) : (
						<span className="mt-0.5 inline-block w-6 shrink-0" aria-hidden />
					)}
				</div>
				<div className="grid min-w-0 flex-1 gap-1">
					<div className="flex min-w-0 items-center gap-2">
						<span className="truncate font-medium">
							{client.tradeName || client.legalName}
						</span>
					</div>
					{client.tradeName ? (
						<span className="truncate text-muted-foreground text-xs">
							{client.legalName}
						</span>
					) : null}
					<span className="font-mono text-muted-foreground text-xs">
						{formatDocument(client.type, client.document)}
					</span>
					<div className="mt-1 flex flex-wrap items-center gap-1.5">
						<Badge variant="secondary">
							{messages.admin.enums.clientType[client.type]}
						</Badge>
						<StatusBadge status={client.status} />
						<HierarchyBadge
							isBranch={isBranch}
							isMatrizWithBranches={isMatrizWithBranches}
							isPj={client.type === "PJ"}
							branchCount={client.activeBranchesCount}
						/>
					</div>
				</div>
				<div className="pointer-events-auto">
					<RowActions
						clientId={client.id}
						branchCount={client.activeBranchesCount}
						viewLabel={labels.viewDetails}
						editLabel={labels.edit}
					/>
				</div>
			</div>
		</li>
	);
}

function HierarchyBadge({
	isBranch,
	isMatrizWithBranches,
	isPj,
	branchCount,
}: {
	isBranch: boolean;
	isMatrizWithBranches: boolean;
	isPj: boolean;
	branchCount: number;
}) {
	const messages = useMessages();
	const labels = messages.admin.clients;

	if (isBranch) {
		return (
			<Badge variant="outline" className="shrink-0">
				{messages.common.terms.filial}
			</Badge>
		);
	}
	if (isMatrizWithBranches) {
		return (
			<Badge variant="outline" className="shrink-0">
				{labels.matrizWithBranches(branchCount)}
			</Badge>
		);
	}
	if (isPj) {
		return (
			<Badge variant="outline" className="shrink-0">
				{messages.common.terms.matriz}
			</Badge>
		);
	}
	return null;
}

function StatusBadge({ status }: { status: ClientListItem["status"] }) {
	const messages = useMessages();
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

type RowActionsProps = {
	clientId: string;
	branchCount: number;
	viewLabel: string;
	editLabel: string;
};

function RowActions({
	clientId,
	branchCount,
	viewLabel,
	editLabel,
}: RowActionsProps) {
	const messages = useMessages();

	return (
		<div className="flex items-center justify-end gap-0.5 opacity-100 transition-opacity md:opacity-60 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="size-8"
						aria-label={messages.common.terms.actions}
					>
						<EllipsisIcon aria-hidden="true" className="size-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-44">
					<DropdownMenuItem asChild>
						<Link href={`/admin/clients/${clientId}`}>
							<EyeIcon aria-hidden="true" className="size-4" />
							{viewLabel}
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem asChild>
						<Link href={`/admin/clients/${clientId}?edit=1`}>{editLabel}</Link>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<ArchiveClientButton clientId={clientId} branchCount={branchCount} />
		</div>
	);
}

function EmptyState({
	title,
	description,
	showClearFilters,
}: {
	title: string;
	description: string;
	showClearFilters: boolean;
}) {
	const messages = useMessages();
	const labels = messages.admin.clients;

	return (
		<div className="flex flex-col items-center justify-center gap-3 rounded-lg border bg-background py-16 text-center">
			<div className="flex flex-col gap-1">
				<p className="font-medium">{title}</p>
				{description ? (
					<p className="text-muted-foreground text-sm">{description}</p>
				) : null}
			</div>
			{showClearFilters ? (
				<Button asChild variant="outline" size="sm">
					<Link href="/admin/clients">{labels.emptyForFilter.clear}</Link>
				</Button>
			) : (
				<Button asChild size="sm">
					<Link href="/admin/clients?new=1">{labels.new}</Link>
				</Button>
			)}
		</div>
	);
}
