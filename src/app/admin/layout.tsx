import type { Metadata } from "next";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireAdmin } from "@/lib/auth/helpers";
import { AdminMobileLauncher } from "./_components/admin-mobile-launcher";

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
					{/*
					 * No top header: on desktop the sidebar is always visible (the
					 * in-sidebar trigger collapses it). On mobile a floating
					 * bottom-center pill (`<AdminMobileLauncher />`) opens the
					 * sidebar as a bottom drawer. Extra bottom padding gives the
					 * pill room without overlapping page content.
					 */}
					<div className="flex flex-1 flex-col gap-6 px-4 pt-6 pb-24 sm:gap-8 sm:px-6 sm:pt-6 sm:pb-12">
						{children}
					</div>
					<AdminMobileLauncher />
				</SidebarInset>
			</SidebarProvider>
		</div>
	);
}
