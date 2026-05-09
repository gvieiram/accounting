"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { useMessages } from "@/stores/use-content-store";

type NavItem = {
	title: string;
	url: string;
	icon: LucideIcon;
	items?: { title: string; url: string }[];
};

function isItemActive(pathname: string, href: string): boolean {
	// Dashboard root needs an exact match — otherwise every /admin/* path
	// would highlight it.
	if (href === "/admin") return pathname === "/admin";
	return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavMain({ items }: { items: NavItem[] }) {
	const pathname = usePathname() ?? "";
	const messages = useMessages();
	const { isMobile, setOpenMobile } = useSidebar();

	function handleNavigate() {
		if (isMobile) setOpenMobile(false);
	}

	return (
		<SidebarGroup>
			<SidebarGroupLabel>{messages.admin.nav.sectionLabel}</SidebarGroupLabel>
			<SidebarMenu>
				{items.map((item) => {
					const active = isItemActive(pathname, item.url);
					const hasSubitems = !!item.items?.length;
					return (
						<Collapsible key={item.title} asChild defaultOpen={active}>
							<SidebarMenuItem>
								<SidebarMenuButton
									asChild
									tooltip={item.title}
									isActive={active}
								>
									<Link href={item.url} onClick={handleNavigate}>
										<item.icon />
										<span>{item.title}</span>
									</Link>
								</SidebarMenuButton>
								{hasSubitems ? (
									<>
										<CollapsibleTrigger asChild>
											<SidebarMenuAction className="data-[state=open]:rotate-90">
												<ChevronRight />
												<span className="sr-only">Toggle</span>
											</SidebarMenuAction>
										</CollapsibleTrigger>
										<CollapsibleContent>
											<SidebarMenuSub>
												{item.items?.map((subItem) => {
													const subActive = isItemActive(pathname, subItem.url);
													return (
														<SidebarMenuSubItem key={subItem.title}>
															<SidebarMenuSubButton
																asChild
																isActive={subActive}
															>
																<Link
																	href={subItem.url}
																	onClick={handleNavigate}
																>
																	<span>{subItem.title}</span>
																</Link>
															</SidebarMenuSubButton>
														</SidebarMenuSubItem>
													);
												})}
											</SidebarMenuSub>
										</CollapsibleContent>
									</>
								) : null}
							</SidebarMenuItem>
						</Collapsible>
					);
				})}
			</SidebarMenu>
		</SidebarGroup>
	);
}
