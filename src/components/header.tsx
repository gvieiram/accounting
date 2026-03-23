"use client";

import type { MouseEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { HomeLink } from "@/components/home-link";
import { Logo } from "@/components/logo";
import { MenuToggleIcon } from "@/components/menu-toggle-icon";
import { Button, buttonVariants } from "@/components/ui/button";
import { useActiveSection } from "@/hooks/use-active-section";
import { useScroll } from "@/hooks/use-scroll";
import { cn } from "@/lib/utils";
import { useMessages } from "@/stores/use-content-store";

const SCROLL_PADDING = 56;

const SCROLL_DURATION = 1300;

function easeInOutCubic(t: number): number {
	return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function smoothScrollTo(target: Element, duration: number) {
	const targetTop =
		target.getBoundingClientRect().top + window.scrollY - SCROLL_PADDING;

	if (duration <= 0) {
		window.scrollTo(0, targetTop);
		return;
	}

	const html = document.documentElement;
	html.style.scrollBehavior = "auto";

	const start = window.scrollY;
	const distance = targetTop - start;
	let startTime: number | null = null;

	function step(timestamp: number) {
		if (!startTime) startTime = timestamp;
		const elapsed = timestamp - startTime;
		const progress = Math.min(elapsed / duration, 1);

		window.scrollTo(0, start + distance * easeInOutCubic(progress));

		if (progress < 1) {
			requestAnimationFrame(step);
		} else {
			html.style.scrollBehavior = "";
		}
	}

	requestAnimationFrame(step);
}

export function Header() {
	const messages = useMessages();
	const [open, setOpen] = useState(false);
	const scrolled = useScroll(10);

	const links = messages.home.header.links;

	const sectionIds = useMemo(
		() =>
			links.filter((l) => l.href.startsWith("#")).map((l) => l.href.slice(1)),
		[links],
	);
	const activeSection = useActiveSection(sectionIds);

	function handleAnchorClick(e: MouseEvent<HTMLAnchorElement>, href: string) {
		if (!href.startsWith("#")) return;
		e.preventDefault();
		const target = document.querySelector(href);
		if (target) {
			const prefersReducedMotion = window.matchMedia(
				"(prefers-reduced-motion: reduce)",
			).matches;
			smoothScrollTo(target, prefersReducedMotion ? 0 : SCROLL_DURATION);
			history.pushState(null, "", href);
			if (target instanceof HTMLElement) {
				target.focus({ preventScroll: true });
			}
		}
		setOpen(false);
	}

	useEffect(() => {
		if (open) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [open]);

	return (
		<header
			className={cn("sticky top-0 z-50 w-full border-transparent border-b", {
				"border-border bg-background/95 backdrop-blur-lg supports-backdrop-filter:bg-background/50":
					scrolled,
			})}
		>
			<nav className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
				<HomeLink>
					<Logo />
				</HomeLink>
				<div className="hidden items-center gap-2 md:flex">
					{links.map((link) => (
						<a
							key={link.label}
							className={cn(
								buttonVariants({ variant: "ghost" }),
								link.href.startsWith("#") &&
									activeSection === link.href.slice(1) &&
									"font-semibold",
							)}
							href={link.href}
							onClick={(e) => handleAnchorClick(e, link.href)}
						>
							{link.label}
						</a>
					))}
					<Button variant="outline">{messages.common.actions.login}</Button>
					<Button>{messages.common.actions.start}</Button>
				</div>
				<div className="flex items-center gap-2 md:hidden">
					<Button
						size="icon"
						variant="outline"
						onClick={() => setOpen(!open)}
						aria-expanded={open}
						aria-controls="mobile-menu"
						aria-label={messages.common.a11y.toggleMenu}
					>
						<MenuToggleIcon open={open} className="size-5" duration={300} />
					</Button>
				</div>
			</nav>
			<MobileMenu open={open} className="flex flex-col justify-between gap-2">
				<div className="grid gap-y-2">
					{links.map((link) => (
						<a
							key={link.label}
							className={buttonVariants({
								variant: "ghost",
								className: cn(
									"justify-start",
									link.href.startsWith("#") &&
										activeSection === link.href.slice(1) &&
										"font-semibold",
								),
							})}
							href={link.href}
							onClick={(e) => handleAnchorClick(e, link.href)}
						>
							{link.label}
						</a>
					))}
				</div>
				<div className="flex flex-col gap-2">
					<Button variant="outline" className="w-full bg-transparent">
						{messages.common.actions.login}
					</Button>
					<Button className="w-full">{messages.common.actions.start}</Button>
				</div>
			</MobileMenu>
		</header>
	);
}

type MobileMenuProps = React.ComponentProps<"div"> & {
	open: boolean;
};

function MobileMenu({ open, children, className, ...props }: MobileMenuProps) {
	if (!open || typeof window === "undefined") return null;

	return createPortal(
		<div
			id="mobile-menu"
			className={cn(
				"bg-background/95 backdrop-blur-lg supports-backdrop-filter:bg-background/50",
				"fixed top-14 right-0 bottom-0 left-0 z-40 flex flex-col overflow-hidden border-y md:hidden",
			)}
		>
			<div
				data-slot={open ? "open" : "closed"}
				className={cn(
					"data-[slot=open]:zoom-in-97 ease-out data-[slot=open]:animate-in",
					"size-full p-4",
					className,
				)}
				{...props}
			>
				{children}
			</div>
		</div>,
		document.body,
	);
}
