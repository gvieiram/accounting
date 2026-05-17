"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type * as React from "react";

import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";

type NavItem = {
	title: string;
	url: string;
	icon: LucideIcon;
};

function isItemActive(pathname: string, href: string): boolean {
	if (href === "/admin") return pathname === "/admin";
	return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavSecondary({
	items,
	...props
}: {
	items: NavItem[];
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
	const pathname = usePathname() ?? "";
	const { isMobile, setOpenMobile } = useSidebar();

	function handleNavigate() {
		if (isMobile) setOpenMobile(false);
	}

	return (
		<SidebarGroup {...props}>
			<SidebarGroupContent>
				<SidebarMenu>
					{items.map((item) => {
						const active = isItemActive(pathname, item.url);
						return (
							<SidebarMenuItem key={item.title}>
								<SidebarMenuButton
									asChild
									size="sm"
									isActive={active}
									tooltip={item.title}
								>
									<Link href={item.url} onClick={handleNavigate}>
										<item.icon />
										<span>{item.title}</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
						);
					})}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	);
}
