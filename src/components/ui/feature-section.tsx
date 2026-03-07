"use client";

import {
	type MotionValue,
	motion,
	useScroll,
	useTransform,
} from "framer-motion";
import { CheckIcon } from "lucide-react";
import { useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Bullet = {
	title: string;
	description: string;
};

type FeatureSectionCta = {
	label: string;
	href: string;
	variant?: "default" | "secondary" | "outline";
};

export type FeatureCardData = {
	badge: string;
	title: string;
	description: string;
	bullets: Bullet[];
	cta: FeatureSectionCta;
	accentClassName?: string;
};

type StackedFeaturesProps = {
	features: FeatureCardData[];
};

export function StackedFeatures({ features }: StackedFeaturesProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const { scrollYProgress } = useScroll({
		target: containerRef,
		offset: ["start start", "end end"],
	});

	return (
		<section ref={containerRef} className="mt-40 md:mt-52">
			{features.map((feature, i) => {
				const targetScale = 1 - (features.length - i) * 0.05;
				return (
					<StackedCard
						key={feature.badge}
						index={i}
						feature={feature}
						progress={scrollYProgress}
						range={[i * (1 / features.length), 1]}
						targetScale={targetScale}
					/>
				);
			})}
		</section>
	);
}

type StackedCardProps = {
	index: number;
	feature: FeatureCardData;
	progress: MotionValue<number>;
	range: [number, number];
	targetScale: number;
};

function StackedCard({
	index,
	feature,
	progress,
	range,
	targetScale,
}: StackedCardProps) {
	const cardRef = useRef<HTMLDivElement>(null);
	const scale = useTransform(progress, range, [1, targetScale]);

	return (
		<div
			ref={cardRef}
			className="sticky top-14 flex h-screen items-start justify-center pt-8"
		>
			<motion.div
				style={{
					scale,
					top: `calc(${index * 30}px)`,
				}}
				className="relative mx-auto w-full max-w-5xl origin-top px-4"
			>
				<div
					className={cn(
						"flex h-[calc(100vh-15rem)] flex-col justify-center gap-10 rounded-2xl border p-10 shadow-lg md:p-16",
						feature.accentClassName || "bg-background",
					)}
				>
					<div className="flex flex-col gap-3">
						<Badge variant="outline" className="w-fit">
							{feature.badge}
						</Badge>
						<h2 className="font-heading text-3xl tracking-tight md:text-5xl">
							{feature.title}
						</h2>
						<p className="max-w-2xl text-base text-muted-foreground leading-relaxed md:text-lg">
							{feature.description}
						</p>
					</div>

					<div className="grid gap-4 sm:grid-cols-2 md:pl-1">
						{feature.bullets.map((bullet) => (
							<div
								key={bullet.title}
								className="flex flex-row items-start gap-3"
							>
								<CheckIcon className="mt-1 size-4 shrink-0 text-highlight" />
								<div className="flex flex-col gap-0.5">
									<p className="font-medium text-sm">{bullet.title}</p>
									<p className="text-muted-foreground text-sm">
										{bullet.description}
									</p>
								</div>
							</div>
						))}
					</div>

					<div>
						<Button variant={feature.cta.variant ?? "default"} asChild>
							<a href={feature.cta.href}>{feature.cta.label}</a>
						</Button>
					</div>
				</div>
			</motion.div>
		</div>
	);
}
