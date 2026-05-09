import type { Metadata } from "next";

import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireAdmin } from "@/lib/auth/helpers";
import { AdminBreadcrumb } from "./_components/admin-breadcrumb";
import { AdminSidebarTrigger } from "./_components/admin-sidebar-trigger";

export const metadata: Metadata = {
	robots: { index: false, follow: false, nocache: true },
	title: "Admin - Dashboard",
	description: "Admin dashboard",
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await requireAdmin();
	const user = {
		email: session.user.email,
		name: session.user.name ?? null,
	};

	return (
		<div className="contents">
			<SidebarProvider>
				<AppSidebar user={user} />
				<SidebarInset>
					<header className="flex h-16 shrink-0 items-center gap-2">
						<div className="flex items-center gap-2 px-4">
							{/*
							 * Mobile-only trigger: on desktop the sidebar is always
							 * visible (collapsing to icons), so the in-sidebar trigger
							 * is enough. On mobile the sidebar renders as a closed
							 * Sheet — without this header trigger it would be
							 * unreachable.
							 */}
							<AdminSidebarTrigger className="-ml-1 md:hidden" />
							<Separator
								orientation="vertical"
								className="mr-2 data-[orientation=vertical]:h-4 md:hidden"
							/>
							<AdminBreadcrumb />
						</div>
					</header>
					<div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
				</SidebarInset>
			</SidebarProvider>
		</div>
	);
}
