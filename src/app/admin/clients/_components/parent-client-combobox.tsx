"use client";

import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { searchMatrizCandidatesAction } from "@/features/clients/actions";
import type {
	ClientFormInput,
	ParentClientCandidate,
} from "@/features/clients/types";
import { formatCnpj } from "@/features/clients/utils";
import { cn } from "@/lib/utils";
import { useMessages } from "@/stores/use-content-store";

type ParentClientComboboxProps = {
	excludeId?: string;
	initialParent?: ParentClientCandidate | null;
};

export function ParentClientCombobox({
	excludeId,
	initialParent,
}: ParentClientComboboxProps) {
	const form = useFormContext<ClientFormInput>();
	const messages = useMessages();
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const deferredQuery = useDeferredValue(query);
	const [candidates, setCandidates] = useState<ParentClientCandidate[]>([]);
	const [selected, setSelected] = useState<ParentClientCandidate | null>(
		initialParent ?? null,
	);

	const selectedId = form.watch("parentClientId");
	const allCandidates = useMemo(() => {
		if (!selected) return candidates;
		if (candidates.some((candidate) => candidate.id === selected.id)) {
			return candidates;
		}
		return [selected, ...candidates];
	}, [candidates, selected]);

	useEffect(() => {
		let alive = true;

		async function loadCandidates() {
			const result = await searchMatrizCandidatesAction({
				search: deferredQuery,
				excludeId,
			});
			if (alive) setCandidates(result);
		}

		if (open) void loadCandidates();

		return () => {
			alive = false;
		};
	}, [deferredQuery, excludeId, open]);

	function selectCandidate(candidate: ParentClientCandidate | null) {
		setSelected(candidate);
		form.setValue("parentClientId", candidate?.id ?? null, {
			shouldDirty: true,
			shouldValidate: true,
		});
		form.setValue("parentDocument", candidate?.document, {
			shouldDirty: true,
			shouldValidate: true,
		});
		setOpen(false);
	}

	return (
		<FormField
			control={form.control}
			name="parentClientId"
			render={() => (
				<FormItem>
					<FormLabel>
						{messages.admin.clients.form.fields.parentClientId}
					</FormLabel>
					<Popover open={open} onOpenChange={setOpen}>
						<PopoverTrigger asChild>
							<FormControl>
								<Button
									type="button"
									variant="outline"
									role="combobox"
									aria-expanded={open}
									className="w-full justify-between"
								>
									<span className="truncate text-left">
										{selectedId && selected
											? candidateLabel(selected)
											: messages.admin.clients.form.hints.noParent}
									</span>
									<ChevronsUpDownIcon
										aria-hidden="true"
										className="size-4 opacity-50"
									/>
								</Button>
							</FormControl>
						</PopoverTrigger>
						<PopoverContent className="w-[--radix-popover-trigger-width] p-0">
							<Command shouldFilter={false}>
								<CommandInput
									value={query}
									onValueChange={setQuery}
									placeholder={messages.admin.clients.filter.search}
								/>
								<CommandList>
									<CommandEmpty>
										{messages.admin.clients.form.hints.noParentResults}
									</CommandEmpty>
									<CommandGroup>
										<CommandItem
											value="none"
											onSelect={() => selectCandidate(null)}
										>
											<CheckIcon
												aria-hidden="true"
												className={cn(
													"size-4",
													!selectedId ? "opacity-100" : "opacity-0",
												)}
											/>
											{messages.admin.clients.form.hints.noParent}
										</CommandItem>
										{allCandidates.map((candidate) => (
											<CommandItem
												key={candidate.id}
												value={candidate.id}
												onSelect={() => selectCandidate(candidate)}
											>
												<CheckIcon
													aria-hidden="true"
													className={cn(
														"size-4",
														selectedId === candidate.id
															? "opacity-100"
															: "opacity-0",
													)}
												/>
												<span className="grid min-w-0">
													<span className="truncate">
														{candidate.tradeName || candidate.legalName}
													</span>
													<span className="truncate text-muted-foreground text-xs">
														{candidate.legalName} ·{" "}
														{formatCnpj(candidate.document)}
													</span>
												</span>
											</CommandItem>
										))}
									</CommandGroup>
								</CommandList>
							</Command>
						</PopoverContent>
					</Popover>
					<FormMessage />
				</FormItem>
			)}
		/>
	);
}

function candidateLabel(candidate: ParentClientCandidate): string {
	return `${candidate.tradeName || candidate.legalName} · ${formatCnpj(
		candidate.document,
	)}`;
}
