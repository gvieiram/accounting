"use client";

import { usePathname } from "next/navigation";
import { Fragment } from "react";

import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getBreadcrumbs } from "@/lib/admin/breadcrumbs";
import { useMessages } from "@/stores/use-content-store";
import { useBreadcrumbOverrides } from "./breadcrumb-overrides";

export function AdminBreadcrumb() {
	const pathname = usePathname() ?? "";
	const messages = useMessages();
	const overrides = useBreadcrumbOverrides();
	const items = getBreadcrumbs(pathname, messages, overrides);

	if (items.length === 0) return null;

	return (
		<Breadcrumb>
			<BreadcrumbList>
				{items.map((item, index) => {
					const isLast = index === items.length - 1;
					// `href` is unique per crumb (cumulative path). The last crumb
					// has no href, so we synthesise a stable key from its label.
					const key = item.href ?? `leaf-${item.label}`;
					return (
						<Fragment key={key}>
							<BreadcrumbItem className={isLast ? "" : "hidden md:block"}>
								{item.href ? (
									<BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
								) : (
									<BreadcrumbPage>{item.label}</BreadcrumbPage>
								)}
							</BreadcrumbItem>
							{!isLast && <BreadcrumbSeparator className="hidden md:block" />}
						</Fragment>
					);
				})}
			</BreadcrumbList>
		</Breadcrumb>
	);
}
