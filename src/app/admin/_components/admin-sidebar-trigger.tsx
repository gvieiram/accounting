"use client";

import { PanelLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useMessages } from "@/stores/use-content-store";

/**
 * Localized wrapper around the shadcn `<SidebarTrigger>` so the
 * accessible name is rendered in pt-BR (the raw primitive ships
 * `Toggle Sidebar` in English, which screen readers would announce
 * verbatim on the admin shell).
 *
 * Visual API mirrors the underlying shadcn primitive — accepts a
 * `className` and forwards everything else to the underlying button.
 */
export function AdminSidebarTrigger({
	className,
	...props
}: React.ComponentProps<typeof Button>) {
	const { toggleSidebar } = useSidebar();
	const { admin } = useMessages();

	return (
		<Button
			data-sidebar="trigger"
			data-slot="sidebar-trigger"
			variant="ghost"
			size="icon"
			className={cn("size-7", className)}
			onClick={(event) => {
				props.onClick?.(event);
				toggleSidebar();
			}}
			{...props}
		>
			<PanelLeftIcon />
			<span className="sr-only">{admin.shell.toggleSidebar}</span>
		</Button>
	);
}
