"use client";

import { ListFilterIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { UserListItem, UserListStatus } from "@/features/users/types";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import { useMessages } from "@/stores/use-content-store";
import { UserRowMenu } from "./user-row-menu";

type UsersTableProps = {
	users: UserListItem[];
	currentUserId: string;
};

const ALL_STATUSES: UserListStatus[] = ["ACTIVE", "INVITED", "REVOKED"];
const FILTER_STORAGE_KEY = "duohub:admin-users-filter";

function readStoredFilter(): Set<UserListStatus> | null {
	if (typeof window === "undefined") return null;
	try {
		const raw = window.localStorage.getItem(FILTER_STORAGE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return null;
		const valid = parsed.filter((s): s is UserListStatus =>
			ALL_STATUSES.includes(s as UserListStatus),
		);
		if (valid.length === 0) return null;
		return new Set(valid);
	} catch {
		return null;
	}
}

function writeStoredFilter(value: Set<UserListStatus>): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(
			FILTER_STORAGE_KEY,
			JSON.stringify(Array.from(value)),
		);
	} catch {
		// ignore quota/access errors — filter still works in-memory
	}
}

function resolveDisplayName(user: {
	name: string | null;
	email: string;
}): string {
	const trimmed = user.name?.trim();
	if (trimmed && trimmed.length > 0) return trimmed;
	return user.email;
}

function resolveInitials(user: { name: string | null; email: string }): string {
	return resolveDisplayName(user).slice(0, 2).toUpperCase();
}

export function UsersTable({ users, currentUserId }: UsersTableProps) {
	const messages = useMessages();
	const { admin, common } = messages;
	const labels = admin.users;
	// `null` = filter not resolved yet (SSR / pre-hydration). We render
	// skeleton rows in this state so the user never sees the unfiltered
	// data flash before the localStorage value kicks in.
	const [enabled, setEnabled] = useState<Set<UserListStatus> | null>(null);

	useEffect(() => {
		const stored = readStoredFilter();
		if (!stored) {
			setEnabled(new Set(ALL_STATUSES));
			return;
		}
		// If the stored filter would hide every current row, fall back to
		// "show all" without touching localStorage — the user's preference
		// stays saved for when matching rows return.
		const hasMatch = users.some((u) => stored.has(u.status));
		setEnabled(hasMatch ? stored : new Set(ALL_STATUSES));
	}, [users]);

	const filtered = useMemo(
		() => (enabled ? users.filter((u) => enabled.has(u.status)) : []),
		[users, enabled],
	);

	const isFiltered = enabled !== null && enabled.size !== ALL_STATUSES.length;

	function toggle(status: UserListStatus, checked: boolean) {
		setEnabled((prev) => {
			const base = prev ?? new Set<UserListStatus>(ALL_STATUSES);
			const next = new Set(base);
			if (checked) next.add(status);
			else next.delete(status);
			// Forbid empty filter — flip back to all if user unchecks the last one
			const resolved = next.size === 0 ? new Set(ALL_STATUSES) : next;
			writeStoredFilter(resolved);
			return resolved;
		});
	}

	if (users.length === 0) {
		return (
			<EmptyState
				title={labels.empty.title}
				description={labels.empty.description}
			/>
		);
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>{labels.columns.user}</TableHead>
					<TableHead>
						<div className="-my-1 flex items-center gap-1">
							<span>{labels.columns.status}</span>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="ghost"
										size="icon"
										aria-label={labels.filter.label}
										className={cn("size-6", isFiltered && "text-primary")}
									>
										<ListFilterIcon aria-hidden="true" className="size-3.5" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="start">
									<DropdownMenuCheckboxItem
										checked={(enabled ?? new Set(ALL_STATUSES)).has("ACTIVE")}
										onCheckedChange={(c) => toggle("ACTIVE", Boolean(c))}
									>
										{labels.filter.active}
									</DropdownMenuCheckboxItem>
									<DropdownMenuCheckboxItem
										checked={(enabled ?? new Set(ALL_STATUSES)).has("INVITED")}
										onCheckedChange={(c) => toggle("INVITED", Boolean(c))}
									>
										{labels.filter.invited}
									</DropdownMenuCheckboxItem>
									<DropdownMenuCheckboxItem
										checked={(enabled ?? new Set(ALL_STATUSES)).has("REVOKED")}
										onCheckedChange={(c) => toggle("REVOKED", Boolean(c))}
									>
										{labels.filter.revoked}
									</DropdownMenuCheckboxItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</TableHead>
					<TableHead>{labels.columns.lastAccess}</TableHead>
					<TableHead>{labels.columns.createdAt}</TableHead>
					<TableHead className="sr-only w-12">
						{labels.columns.actions}
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{enabled === null ? (
					<SkeletonRows count={users.length} />
				) : filtered.length === 0 ? (
					<TableRow className="hover:bg-transparent">
						<TableCell
							colSpan={5}
							className="py-12 text-center text-muted-foreground"
						>
							{labels.emptyForFilter.noMatch}
						</TableCell>
					</TableRow>
				) : (
					filtered.map((row) => (
						<TableRow key={`${row.kind}:${row.id}`}>
							<TableCell>
								<div className="flex items-center gap-3">
									<Avatar aria-hidden="true">
										<AvatarFallback>{resolveInitials(row)}</AvatarFallback>
									</Avatar>
									<div className="grid leading-tight">
										<span className="truncate font-medium">
											{resolveDisplayName(row)}
										</span>
										{row.name && (
											<span className="truncate text-muted-foreground text-xs">
												{row.email}
											</span>
										)}
									</div>
								</div>
							</TableCell>
							<TableCell>
								<StatusBadge row={row} labels={labels.statusBadge} />
							</TableCell>
							<TableCell>
								{row.lastAccessAt ? (
									formatDate(row.lastAccessAt)
								) : (
									<span className="text-muted-foreground">
										{common.terms.never}
									</span>
								)}
							</TableCell>
							<TableCell>{formatDate(row.createdAt)}</TableCell>
							<TableCell className="text-right">
								<UserRowMenu
									row={row}
									disableRevoke={
										row.kind === "user" && row.id === currentUserId
									}
								/>
							</TableCell>
						</TableRow>
					))
				)}
			</TableBody>
		</Table>
	);
}

function SkeletonRows({ count }: { count: number }) {
	return (
		<>
			{Array.from({ length: Math.max(count, 1) }).map((_, i) => (
				<TableRow
					// biome-ignore lint/suspicious/noArrayIndexKey: skeleton row order is stable for a given count
					key={i}
					className="hover:bg-transparent"
				>
					<TableCell>
						<div className="flex items-center gap-3">
							<Skeleton className="size-8 rounded-full" />
							<Skeleton className="h-4 w-40" />
						</div>
					</TableCell>
					<TableCell>
						<Skeleton className="h-5 w-16 rounded-full" />
					</TableCell>
					<TableCell>
						<Skeleton className="h-4 w-24" />
					</TableCell>
					<TableCell>
						<Skeleton className="h-4 w-24" />
					</TableCell>
					<TableCell />
				</TableRow>
			))}
		</>
	);
}

function StatusBadge({
	row,
	labels,
}: {
	row: UserListItem;
	labels: {
		active: string;
		invited: string;
		expired: string;
		revoked: string;
	};
}) {
	if (row.status === "ACTIVE") {
		return <Badge variant="default">{labels.active}</Badge>;
	}
	if (row.status === "INVITED") {
		if (row.inviteExpired) {
			return <Badge variant="destructive">{labels.expired}</Badge>;
		}
		return <Badge variant="secondary">{labels.invited}</Badge>;
	}
	return <Badge variant="outline">{labels.revoked}</Badge>;
}

function EmptyState({
	title,
	description,
}: {
	title: string;
	description: string;
}) {
	return (
		<div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
			<p className="font-medium">{title}</p>
			{description ? (
				<p className="text-muted-foreground text-sm">{description}</p>
			) : null}
		</div>
	);
}
