"use client";

import { SearchIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CLIENT_STATUSES, CLIENT_TYPES } from "@/features/clients/constants";
import { useMessages } from "@/stores/use-content-store";

const ALL_VALUE = "__all";

export function ClientsFilters() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const messages = useMessages();
	const labels = messages.admin.clients.filter;
	const urlQuery = searchParams.get("q") ?? "";
	const [query, setQuery] = useState(urlQuery);

	const replaceParams = useCallback(
		(updates: Record<string, string | null>) => {
			const next = new URLSearchParams(searchParams.toString());
			for (const [key, value] of Object.entries(updates)) {
				if (value === null || value.length === 0) next.delete(key);
				else next.set(key, value);
			}
			router.replace(`${pathname}?${next.toString()}`, { scroll: false });
		},
		[pathname, router, searchParams],
	);

	// Sync local input with the URL when it changes externally (back/forward,
	// or another filter change that triggers a re-render). The guard prevents
	// looping with the debounce effect below.
	useEffect(() => {
		setQuery((current) => (current === urlQuery ? current : urlQuery));
	}, [urlQuery]);

	// Debounce keystrokes before pushing to the URL — typing should feel local
	// even though the list re-renders on every URL change.
	useEffect(() => {
		if (query === urlQuery) return;
		const timer = setTimeout(() => {
			replaceParams({ q: query.trim() || null });
		}, 300);
		return () => clearTimeout(timer);
	}, [query, urlQuery, replaceParams]);

	return (
		<div className="grid gap-3 rounded-md border bg-background p-3 md:grid-cols-[minmax(16rem,1fr)_11rem_11rem_auto]">
			<div className="relative">
				<SearchIcon
					aria-hidden="true"
					className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
				/>
				<Input
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder={labels.search}
					className="pl-9"
				/>
			</div>
			<Select
				value={searchParams.get("type") ?? ALL_VALUE}
				onValueChange={(value) =>
					replaceParams({ type: value === ALL_VALUE ? null : value })
				}
			>
				<SelectTrigger className="w-full">
					<SelectValue aria-label={labels.type} />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value={ALL_VALUE}>{labels.allTypes}</SelectItem>
					{CLIENT_TYPES.map((type) => (
						<SelectItem key={type} value={type}>
							{messages.admin.enums.clientType[type]}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<Select
				value={searchParams.get("status") ?? ALL_VALUE}
				onValueChange={(value) =>
					replaceParams({ status: value === ALL_VALUE ? null : value })
				}
			>
				<SelectTrigger className="w-full">
					<SelectValue aria-label={labels.status} />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value={ALL_VALUE}>{labels.allStatuses}</SelectItem>
					{CLIENT_STATUSES.map((status) => (
						<SelectItem key={status} value={status}>
							{messages.admin.enums.clientStatus[status]}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<div className="flex items-center gap-2 px-1">
				<Switch
					id="show-archived"
					checked={searchParams.get("archived") === "1"}
					onCheckedChange={(checked) =>
						replaceParams({ archived: checked ? "1" : null })
					}
				/>
				<Label htmlFor="show-archived" className="whitespace-nowrap text-sm">
					{labels.archived}
				</Label>
			</div>
		</div>
	);
}
