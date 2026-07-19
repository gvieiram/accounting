"use client";

import { SiWhatsapp } from "@icons-pack/react-simple-icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatedThemeToggle } from "@/components/animated-theme-toggle";
import { HomeLink } from "@/components/home-link";
import { Logo } from "@/components/logo";
import { MenuToggleIcon } from "@/components/menu-toggle-icon";
import { Button, buttonVariants } from "@/components/ui/button";
import { useActiveSection } from "@/hooks/use-active-section";
import { useScroll } from "@/hooks/use-scroll";
import { cn } from "@/lib/utils";
import { useCompany, useMessages } from "@/stores/use-content-store";

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

type HeaderProps = {
	/**
	 * Forwarded to `<Logo isCentered={...} />`. Resolved on the server
	 * via `resolveAll()` from `@/lib/posthog/flags`.
	 */
	isLogoCentered?: boolean;
};

// Auth-flow routes (login + post-login trampoline) deliberately render
// without the marketing chrome — they're tool views, not institutional
// pages. Keeping the chrome would also make `/login` look like a regular
// landing page section and confuse users with brand nav while they're
// trying to authenticate.
const HIDDEN_PATH_PREFIXES = [
	"/admin",
	"/app",
	"/login",
	"/post-login",
	"/invite",
];

export function Header({ isLogoCentered = false }: HeaderProps) {
	const pathname = usePathname();
	const messages = useMessages();
	const company = useCompany();
	const [open, setOpen] = useState(false);
	const scrolled = useScroll(10);
	const whatsappUrl = company.links.whatsappUrl(messages.home.cta.whatsappText);

	const links = messages.home.header.links;

	const isHidden = HIDDEN_PATH_PREFIXES.some((prefix) =>
		pathname.startsWith(prefix),
	);

	const sectionIds = useMemo(
		() =>
			links
				.filter((l) => l.href.startsWith("#") || l.href.startsWith("/#"))
				.map((l) => {
					const hashIdx = l.href.indexOf("#");
					return l.href.slice(hashIdx + 1);
				}),
		[links],
	);
	const activeSection = useActiveSection(sectionIds);

	function handleAnchorClick(e: MouseEvent<HTMLAnchorElement>, href: string) {
		const hashIndex = href.indexOf("#");
		if (hashIndex < 0) {
			setOpen(false);
			return;
		}

		const targetPath = href.slice(0, hashIndex) || "/";
		const targetHash = href.slice(hashIndex);
		const isOnTargetPage =
			targetPath === "/"
				? window.location.pathname === "/"
				: window.location.pathname === targetPath;

		if (!isOnTargetPage) {
			setOpen(false);
			return;
		}

		e.preventDefault();
		const target = document.querySelector(targetHash);
		if (target) {
			const prefersReducedMotion = window.matchMedia(
				"(prefers-reduced-motion: reduce)",
			).matches;
			smoothScrollTo(target, prefersReducedMotion ? 0 : SCROLL_DURATION);
			history.pushState(null, "", targetHash);
			if (target instanceof HTMLElement) {
				target.focus({ preventScroll: true });
			}
		}
		setOpen(false);
	}

	function isAnchorLink(href: string): boolean {
		return href.startsWith("#") || href.startsWith("/#");
	}

	function anchorActiveId(href: string): string | null {
		if (!isAnchorLink(href)) return null;
		return href.slice(href.indexOf("#") + 1);
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

	if (isHidden) {
		return null;
	}

	return (
		<header
			className={cn("sticky top-0 z-50 w-full border-transparent border-b", {
				"border-border bg-background/95 backdrop-blur-lg supports-backdrop-filter:bg-background/50":
					scrolled,
			})}
		>
			<nav className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
				<HomeLink>
					<Logo isCentered={isLogoCentered} />
				</HomeLink>
				<div className="hidden items-center gap-2 md:flex">
					{links.map((link) => {
						const activeId = anchorActiveId(link.href);
						const className = cn(
							buttonVariants({ variant: "ghost" }),
							activeId && activeSection === activeId && "font-semibold",
						);
						const content = (
							<>
								{link.label}
								{"badge" in link && link.badge && (
									<span className="ml-2 inline-flex items-center rounded bg-primary/10 px-1.5 py-0.5 font-medium text-[10px] text-primary">
										{link.badge}
									</span>
								)}
							</>
						);
						return isAnchorLink(link.href) ? (
							<a
								key={link.label}
								className={className}
								href={link.href}
								onClick={(e) => handleAnchorClick(e, link.href)}
							>
								{content}
							</a>
						) : (
							<Link
								key={link.label}
								className={className}
								href={link.href}
								onClick={() => setOpen(false)}
							>
								{content}
							</Link>
						);
					})}
					<AnimatedThemeToggle />
					<Button asChild>
						<a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
							{messages.common.actions.start}
						</a>
					</Button>
				</div>
				<div className="flex items-center gap-2 md:hidden">
					<AnimatedThemeToggle />
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
					{links.map((link) => {
						const activeId = anchorActiveId(link.href);
						const className = buttonVariants({
							variant: "ghost",
							className: cn(
								"justify-start",
								activeId && activeSection === activeId && "font-semibold",
							),
						});
						const content = (
							<>
								{link.label}
								{"badge" in link && link.badge && (
									<span className="ml-2 inline-flex items-center rounded bg-primary/10 px-1.5 py-0.5 font-medium text-[10px] text-primary">
										{link.badge}
									</span>
								)}
							</>
						);
						return isAnchorLink(link.href) ? (
							<a
								key={link.label}
								className={className}
								href={link.href}
								onClick={(e) => handleAnchorClick(e, link.href)}
							>
								{content}
							</a>
						) : (
							<Link
								key={link.label}
								className={className}
								href={link.href}
								onClick={() => setOpen(false)}
							>
								{content}
							</Link>
						);
					})}
				</div>
				<Button asChild className="w-full">
					<a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
						<SiWhatsapp className="size-4" color="currentColor" />
						{messages.common.actions.start}
					</a>
				</Button>
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
