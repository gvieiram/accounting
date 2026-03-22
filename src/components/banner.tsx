"use client";

import { XIcon } from "lucide-react";
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
	cta?: BannerCta;
	dismissible?: boolean;
	dismissLabel?: string;
	storageKey?: string;
	position?: "bottom" | "top";
	className?: string;
};

export function Banner({
	icon,
	title,
	description,
	cta,
	dismissible = true,
	dismissLabel,
	storageKey = "banner",
	position = "bottom",
	className,
}: BannerProps) {
	const [state, setState] = useState<
		"pending" | "visible" | "dismissing" | "hidden"
	>("pending");
	const scrolled = useScroll(10);

	const shouldShow = state === "visible" && (position === "bottom" || scrolled);
	const isDismissing = state === "dismissing";
	const isOffscreen = !shouldShow && !isDismissing;

	useEffect(() => {
		if (dismissible && storageKey) {
			const wasDismissed =
				localStorage.getItem(`banner:${storageKey}`) === "dismissed";
			setState(wasDismissed ? "hidden" : "visible");
		} else {
			setState("visible");
		}
	}, [dismissible, storageKey]);

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
					<BannerBody title={title} description={description} cta={cta} />
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
	cta,
}: {
	title: string;
	description?: string;
	cta?: BannerCta;
}) {
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
			{cta && (
				<Button asChild variant="outline" className="w-full shrink-0 sm:w-auto">
					<a
						href={cta.href}
						target={cta.external ? "_blank" : undefined}
						rel={cta.external ? "noopener noreferrer" : undefined}
					>
						{cta.label}
					</a>
				</Button>
			)}
		</div>
	);
}
