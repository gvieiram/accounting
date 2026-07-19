"use client";

import { ChevronsUpDown, LogOut, Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { logoutAction } from "@/features/auth/actions";
import { authClient } from "@/lib/auth/auth-client";
import { useMessages } from "@/stores/use-content-store";

type NavUserProps = {
	user: {
		name: string | null;
		email: string;
	};
};

function resolveDisplayName(user: NavUserProps["user"]): string {
	const trimmed = user.name?.trim();
	if (trimmed && trimmed.length > 0) return trimmed;
	return user.email;
}

function resolveInitials(user: NavUserProps["user"]): string {
	const display = resolveDisplayName(user);
	return display.slice(0, 2).toUpperCase();
}

export function NavUser({ user }: NavUserProps) {
	const { isMobile } = useSidebar();
	const messages = useMessages();
	const router = useRouter();

	const displayName = resolveDisplayName(user);
	const initials = resolveInitials(user);

	async function handleLogout() {
		try {
			await logoutAction();
			// Defence-in-depth: even if the Server Action's signOut threw,
			// wipe the client cookie before redirecting.
			await authClient.signOut();
			router.push("/login");
		} catch {
			toast.error(messages.admin.errors.logoutFailed, {
				duration: 8000,
				id: "admin-logout-failed",
			});
		}
	}

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							aria-label={user.email}
							data-testid="admin-user-menu-trigger"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						>
							<Avatar className="h-8 w-8 rounded-lg">
								<AvatarFallback className="rounded-lg">
									{initials}
								</AvatarFallback>
							</Avatar>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-medium">{displayName}</span>
								<span className="truncate text-xs">{user.email}</span>
							</div>
							<ChevronsUpDown className="ml-auto size-4" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
						side={isMobile ? "bottom" : "right"}
						align="end"
						sideOffset={4}
					>
						<DropdownMenuLabel className="p-0 font-normal">
							<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
								<Avatar className="h-8 w-8 rounded-lg">
									<AvatarFallback className="rounded-lg">
										{initials}
									</AvatarFallback>
								</Avatar>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-medium">{displayName}</span>
									<span className="truncate text-xs">{user.email}</span>
								</div>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<ThemeMenuItem />
						<DropdownMenuSeparator />
						<DropdownMenuItem
							data-testid="admin-logout"
							onSelect={handleLogout}
						>
							<LogOut />
							{messages.admin.shell.logout}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}

/**
 * `resolvedTheme` só existe depois da hidratação — no servidor não há como saber
 * a preferência guardada. Sem a guarda, o item renderiza com o rótulo errado e o
 * React acusa mismatch.
 */
function ThemeMenuItem() {
	const { resolvedTheme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);
	const messages = useMessages();

	useEffect(() => setMounted(true), []);

	const isDark = mounted && resolvedTheme === "dark";

	return (
		<DropdownMenuItem
			data-testid="admin-theme-toggle"
			onSelect={() => setTheme(isDark ? "light" : "dark")}
		>
			{isDark ? <Sun /> : <Moon />}
			{isDark
				? messages.admin.shell.themeLight
				: messages.admin.shell.themeDark}
		</DropdownMenuItem>
	);
}
