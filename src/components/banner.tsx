"use client";

import { XIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useScroll } from "@/hooks/use-scroll";
import { cn } from "@/lib/utils";

type BannerCta = {
	label: string;
	href: string;
	external?: boolean;
};

type BannerProps = {
	icon?: React.ReactNode;
	title: string;
	description?: string;
	ctas?: BannerCta[];
	dismissible?: boolean;
	dismissLabel?: string;
	storageKey?: string;
	position?: "bottom" | "top";
	enabledOnPaths?: string[];
	className?: string;
};

export function Banner({
	icon,
	title,
	description,
	ctas,
	dismissible = true,
	dismissLabel,
	storageKey = "banner",
	position = "bottom",
	enabledOnPaths,
	className,
}: BannerProps) {
	const pathname = usePathname();
	const [state, setState] = useState<
		"pending" | "visible" | "dismissing" | "hidden"
	>("pending");
	const scrolled = useScroll(10);

	const isHiddenPath = ["/admin", "/app", "/login", "/post-login"].some(
		(prefix) => pathname.startsWith(prefix),
	);
	const isPathAllowed =
		!isHiddenPath &&
		(!enabledOnPaths || enabledOnPaths.length === 0
			? true
			: enabledOnPaths.includes(pathname));

	const shouldShow = state === "visible" && (position === "bottom" || scrolled);
	const isDismissing = state === "dismissing";
	const isOffscreen = !shouldShow && !isDismissing;

	useEffect(() => {
		if (!isPathAllowed) {
			setState("hidden");
			return;
		}

		if (dismissible && storageKey) {
			const wasDismissed =
				localStorage.getItem(`banner:${storageKey}`) === "dismissed";
			setState(wasDismissed ? "hidden" : "visible");
		} else {
			setState("visible");
		}
	}, [dismissible, storageKey, isPathAllowed]);

	function handleDismiss() {
		setState("dismissing");
		if (storageKey) {
			localStorage.setItem(`banner:${storageKey}`, "dismissed");
		}
	}

	if (state === "pending" || state === "hidden") return null;

	return (
		<div
			aria-live="polite"
			className={cn(
				"fixed right-0 left-0 z-40 mx-4 transition-all duration-300 ease-out sm:mx-6",
				position === "bottom" ? "bottom-4" : "top-18",
				(isDismissing || isOffscreen) && "pointer-events-none opacity-0",
				isDismissing && position === "bottom" && "translate-y-4",
				(isDismissing || isOffscreen) &&
					position === "top" &&
					"-translate-y-full",
				className,
			)}
			data-state={state}
			onTransitionEnd={() => {
				if (isDismissing) setState("hidden");
			}}
		>
			<div className="mx-auto max-w-5xl rounded-lg border bg-background shadow-lg">
				<div className="flex items-center gap-4 p-4">
					<BannerIcon>{icon}</BannerIcon>
					<BannerBody title={title} description={description} ctas={ctas} />
					{dismissible && (
						<Button
							variant="ghost"
							size="icon-xs"
							onClick={handleDismiss}
							aria-label={dismissLabel}
							className="shrink-0"
						>
							<XIcon />
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}

function BannerIcon({ children }: { children?: React.ReactNode }) {
	if (!children) return null;
	return (
		<div className="hidden shrink-0 rounded-lg border bg-muted p-2.5 text-muted-foreground sm:flex">
			{children}
		</div>
	);
}

function BannerBody({
	title,
	description,
	ctas,
}: {
	title: string;
	description?: string;
	ctas?: BannerCta[];
}) {
	const hasCtas = ctas && ctas.length > 0;

	return (
		<div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
			<div className="min-w-0 flex-1">
				<p className="font-medium text-sm leading-snug">{title}</p>
				{description && (
					<p className="mt-0.5 text-muted-foreground text-sm leading-snug">
						{description}
					</p>
				)}
			</div>
			{hasCtas && (
				<div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
					{ctas.map((cta, index) => (
						<BannerCtaButton
							key={`${cta.href}-${cta.label}`}
							cta={cta}
							variant={variantForIndex(index, ctas.length)}
						/>
					))}
				</div>
			)}
		</div>
	);
}

/**
 * Convention aligned with the Vercel Flag config:
 * with two CTAs, index 0 is secondary (outline) and index 1 is primary (default).
 * With a single CTA, use outline to avoid over-emphasising the banner.
 */
function variantForIndex(index: number, total: number): "default" | "outline" {
	if (total === 1) return "outline";
	return index === 0 ? "outline" : "default";
}

function BannerCtaButton({
	cta,
	variant,
}: {
	cta: BannerCta;
	variant: "default" | "outline";
}) {
	return (
		<Button asChild variant={variant} className="w-full sm:w-auto">
			{cta.external ? (
				<a href={cta.href} target="_blank" rel="noopener noreferrer">
					{cta.label}
				</a>
			) : (
				<Link href={cta.href}>{cta.label}</Link>
			)}
		</Button>
	);
}
