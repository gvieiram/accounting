"use client";

import { MenuIcon } from "lucide-react";

import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useMessages } from "@/stores/use-content-store";

/**
 * Floating bottom-center pill used on mobile to open the sidebar drawer.
 * Hides on desktop (sidebar is always visible there) and while the drawer
 * is already open (the sheet covers it and its close button takes over).
 */
export function AdminMobileLauncher() {
	const { isMobile, openMobile, setOpenMobile } = useSidebar();
	const { admin } = useMessages();

	if (!isMobile || openMobile) return null;

	return (
		<button
			type="button"
			onClick={() => setOpenMobile(true)}
			className={cn(
				"fixed bottom-4 left-1/2 z-40 -translate-x-1/2",
				"flex items-center gap-2 rounded-full px-4 py-2.5",
				"bg-sidebar text-sidebar-foreground shadow-lg ring-1 ring-border/60",
				"backdrop-blur supports-[backdrop-filter]:bg-sidebar/90",
				"transition active:scale-95",
			)}
		>
			<MenuIcon className="size-4" />
			<span className="font-medium text-sm">{admin.shell.menu}</span>
		</button>
	);
}
