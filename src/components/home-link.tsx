"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

const SCROLL_DURATION = 1300;

function easeInOutCubic(t: number): number {
	return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export function HomeLink({
	children,
	className,
	...props
}: Omit<React.ComponentProps<typeof Link>, "href">) {
	function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
		if (window.location.pathname === "/") {
			e.preventDefault();
			const prefersReducedMotion = window.matchMedia(
				"(prefers-reduced-motion: reduce)",
			).matches;
			const html = document.documentElement;
			html.style.scrollBehavior = "auto";

			if (prefersReducedMotion || window.scrollY === 0) {
				window.scrollTo(0, 0);
				html.style.scrollBehavior = "";
				return;
			}

			const start = window.scrollY;
			let startTime: number | null = null;

			function step(timestamp: number) {
				if (!startTime) startTime = timestamp;
				const progress = Math.min((timestamp - startTime) / SCROLL_DURATION, 1);
				window.scrollTo(0, start * (1 - easeInOutCubic(progress)));
				if (progress < 1) {
					requestAnimationFrame(step);
				} else {
					html.style.scrollBehavior = "";
				}
			}

			requestAnimationFrame(step);
			history.pushState(null, "", "/");
		}
	}

	return (
		<Link href="/" className={cn(className)} onClick={handleClick} {...props}>
			{children}
		</Link>
	);
}
