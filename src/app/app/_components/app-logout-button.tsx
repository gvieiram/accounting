"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { logoutAction } from "@/features/auth/actions";
import { authClient } from "@/lib/auth/auth-client";
import { useMessages } from "@/stores/use-content-store";

export function AppLogoutButton() {
	const router = useRouter();
	const messages = useMessages();

	async function handleLogout() {
		try {
			await logoutAction();
			await authClient.signOut();
			router.push("/login");
		} catch {
			toast.error(messages.admin.errors.logoutFailed, {
				duration: 8000,
				id: "app-logout-failed",
			});
		}
	}

	return (
		<Button
			variant="outline"
			size="sm"
			onClick={handleLogout}
			data-testid="app-logout"
		>
			<LogOut className="size-4" />
			{messages.app.placeholder.logoutLabel}
		</Button>
	);
}
