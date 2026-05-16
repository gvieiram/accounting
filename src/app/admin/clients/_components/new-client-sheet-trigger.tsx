"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { ClientFormSheet } from "./client-form-sheet";

export function NewClientSheetTrigger() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const open = searchParams.get("new") === "1";

	const handleOpenChange = useCallback(
		(next: boolean) => {
			if (next) return;
			const params = new URLSearchParams(searchParams.toString());
			params.delete("new");
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
			mode="create"
		/>
	);
}
