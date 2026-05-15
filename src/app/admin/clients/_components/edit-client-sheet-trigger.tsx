"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import type {
	ClientFormInput,
	ParentClientCandidate,
} from "@/features/clients/types";

import { ClientFormSheet } from "./client-form-sheet";

type EditClientSheetTriggerProps = {
	clientId: string;
	displayName: string;
	initialValues: ClientFormInput;
	initialParent: ParentClientCandidate | null;
};

export function EditClientSheetTrigger({
	clientId,
	displayName,
	initialValues,
	initialParent,
}: EditClientSheetTriggerProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const open = searchParams.get("edit") === "1";

	const handleOpenChange = useCallback(
		(next: boolean) => {
			if (next) return;
			const params = new URLSearchParams(searchParams.toString());
			params.delete("edit");
			const query = params.toString();
			router.replace(query ? `${pathname}?${query}` : pathname, {
				scroll: false,
			});
			router.refresh();
		},
		[pathname, router, searchParams],
	);

	return (
		<ClientFormSheet
			open={open}
			onOpenChange={handleOpenChange}
			mode="edit"
			clientId={clientId}
			displayName={displayName}
			initialValues={initialValues}
			initialParent={initialParent}
		/>
	);
}
