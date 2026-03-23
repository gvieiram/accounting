"use client";

import {
	type MotionValue,
	motion,
	useScroll,
	useTransform,
} from "framer-motion";
import { CheckIcon } from "lucide-react";
import Image from "next/image";
import { useRef } from "react";
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
	illustration?: string;
	illustrationAlt?: string;
};

type StackedFeaturesProps = {
	features: FeatureCardData[];
	showImages?: boolean;
};

type FeatureCardContentProps = {
	feature: FeatureCardData;
	showImages?: boolean;
};

function FeatureCardContent({
	feature,
	showImages = false,
}: FeatureCardContentProps) {
	return (
		<>
			<div className="flex flex-1 flex-col gap-5 md:gap-8">
				<div className="flex flex-col gap-3">
					<span className="inline-flex items-center gap-2 font-medium text-highlight text-sm">
						<span className="h-px w-4 bg-highlight" aria-hidden="true" />
						{feature.badge}
					</span>
					<h2 className="font-heading text-2xl tracking-tight md:text-4xl lg:text-5xl">
						{feature.title}
					</h2>
				</div>

				<p className="max-w-2xl text-muted-foreground text-sm leading-relaxed md:text-base lg:text-lg">
					{feature.description}
				</p>

				<div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-8">
					{showImages && feature.illustration && (
						<div className="hidden md:block md:w-2/5 md:shrink-0">
							<div className="relative aspect-4/3 overflow-hidden rounded-xl">
								<Image
									src={feature.illustration}
									alt={feature.illustrationAlt ?? ""}
									fill
									className="object-cover"
								/>
							</div>
						</div>
					)}

					<div className="grid grid-cols-1 gap-y-3 md:flex-1 md:gap-y-4">
						{feature.bullets.map((bullet) => (
							<div
								key={bullet.title}
								className="flex items-start gap-2.5 md:gap-3"
							>
								<CheckIcon className="mt-0.5 size-4 shrink-0 text-highlight" />
								<div className="flex flex-col gap-0.5">
									<p className="font-medium text-sm">{bullet.title}</p>
									<p className="text-muted-foreground text-sm">
										{bullet.description}
									</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>

			<div className="flex justify-end">
				<Button variant={feature.cta.variant ?? "default"} size="lg" asChild>
					<a href={feature.cta.href}>{feature.cta.label}</a>
				</Button>
			</div>
		</>
	);
}

export function StackedFeatures({
	features,
	showImages = false,
}: StackedFeaturesProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const { scrollYProgress } = useScroll({
		target: containerRef,
		offset: ["start start", "end end"],
	});

	const total = features.length;

	return (
		<section id="servicos" ref={containerRef} className="mt-24 md:mt-52">
			{features.map((feature, i) => {
				const targetScale = 1 - (total - i) * 0.05;
				const isLast = i === total - 1;
				const nextCardAppears = (i + 1) / total;

				return (
					<StackedCard
						key={feature.badge}
						index={i}
						feature={feature}
						showImages={showImages}
						progress={scrollYProgress}
						range={[i / total, 1]}
						targetScale={targetScale}
						shrinkRange={isLast ? null : [nextCardAppears, 1]}
					/>
				);
			})}
		</section>
	);
}

type StackedCardProps = {
	index: number;
	feature: FeatureCardData;
	showImages?: boolean;
	progress: MotionValue<number>;
	range: [number, number];
	targetScale: number;
	shrinkRange: [number, number] | null;
};

function StackedCard({
	index,
	feature,
	showImages,
	progress,
	range,
	targetScale,
	shrinkRange,
}: StackedCardProps) {
	const cardRef = useRef<HTMLDivElement>(null);
	const scale = useTransform(progress, range, [1, targetScale]);

	const clipBottom = useTransform(
		progress,
		shrinkRange
			? [shrinkRange[0] - 0.05, shrinkRange[0], shrinkRange[1]]
			: [0, 0.5, 1],
		shrinkRange
			? ["inset(0 0 0% 0)", "inset(0 0 0% 0)", "inset(0 0 20% 0)"]
			: ["inset(0 0 0% 0)", "inset(0 0 0% 0)", "inset(0 0 0% 0)"],
	);

	return (
		<div
			ref={cardRef}
			className="sticky top-18 flex h-screen items-start justify-center pt-6 md:pt-8"
		>
			<motion.div
				style={{
					scale,
					top: `calc(${index * 30}px)`,
				}}
				className="relative mx-auto w-full max-w-5xl origin-top px-4 drop-shadow-lg"
			>
				<motion.div
					style={{ clipPath: clipBottom }}
					className={cn(
						"flex min-h-[calc(100svh-10rem)] flex-col gap-5 rounded-2xl border p-6 md:min-h-0 md:gap-8 md:p-10 lg:p-16",
						feature.accentClassName || "bg-background",
					)}
				>
					<FeatureCardContent feature={feature} showImages={showImages} />
				</motion.div>
			</motion.div>
		</div>
	);
}
