"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import {
	CheckIcon,
	Compass,
	HeartHandshake,
	Lightbulb,
	RefreshCw,
	Zap,
} from "lucide-react";
import type { messages } from "@/content/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/stores/use-content-store";

type AboutModel = (typeof messages.home.about.models)[number];
type AboutValue = (typeof messages.home.about.values)[number];

const easeOut = [0.25, 0.46, 0.45, 0.94] as const;

// biome-ignore-start lint/style/useNamingConvention: keys match Lucide names in content
const iconMap = {
	Compass,
	HeartHandshake,
	Lightbulb,
	RefreshCw,
	Zap,
} as const;
// biome-ignore-end lint/style/useNamingConvention: keys match Lucide names in content

function MissionBlock({
	badge,
	title,
	description,
	shouldReduceMotion,
}: {
	badge: string;
	title: string;
	description: string;
	shouldReduceMotion: boolean;
}) {
	const step = shouldReduceMotion ? 0 : 0.15;
	const hidden = shouldReduceMotion
		? { opacity: 1, y: 0 }
		: { opacity: 0, y: 24 };
	const visible = { opacity: 1, y: 0 };
	const baseTransition = (delay: number) =>
		shouldReduceMotion
			? { duration: 0 }
			: { duration: 0.5, delay: delay * step, ease: easeOut };

	return (
		<div className="flex flex-col items-center gap-4 md:gap-5">
			<motion.div
				className="flex justify-center"
				initial={hidden}
				transition={baseTransition(0)}
				viewport={{ once: true }}
				whileInView={visible}
			>
				<span className="inline-flex items-center gap-2 font-medium text-highlight text-sm">
					<span className="h-px w-4 bg-highlight" aria-hidden="true" />
					{badge}
				</span>
			</motion.div>
			<motion.h2
				className="text-center font-heading text-3xl tracking-tight md:text-4xl lg:text-5xl"
				id="about-heading"
				initial={hidden}
				transition={baseTransition(1)}
				viewport={{ once: true }}
				whileInView={visible}
			>
				{title}
			</motion.h2>
			<motion.p
				className="mx-auto max-w-2xl text-center text-muted-foreground leading-relaxed"
				initial={hidden}
				transition={baseTransition(2)}
				viewport={{ once: true }}
				whileInView={visible}
			>
				{description}
			</motion.p>
		</div>
	);
}

function DuoModelCard({
	model,
	fromLeft,
	shouldReduceMotion,
}: {
	model: AboutModel;
	fromLeft: boolean;
	shouldReduceMotion: boolean;
}) {
	const Icon = iconMap[model.icon as keyof typeof iconMap];
	const xHidden = shouldReduceMotion ? 0 : fromLeft ? -60 : 60;
	const accentClass =
		model.accentColor === "primary" ? "text-primary" : "text-highlight";

	return (
		<motion.div
			className="rounded-xl border bg-card p-6 md:p-8"
			initial={
				shouldReduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: xHidden }
			}
			transition={
				shouldReduceMotion
					? { duration: 0 }
					: {
							duration: 0.7,
							delay: fromLeft ? 0 : 0.15,
							ease: easeOut,
						}
			}
			viewport={{ amount: 0.2, once: true }}
			whileInView={{ opacity: 1, x: 0 }}
		>
			<div className="flex flex-col gap-4">
				{Icon ? (
					<Icon aria-hidden className={cn("size-12 shrink-0", accentClass)} />
				) : null}
				<h3 className="font-heading text-xl">{model.title}</h3>
				<p className="text-muted-foreground text-sm leading-relaxed">
					{model.description}
				</p>
				<ul className="flex flex-col gap-2">
					{model.bullets.map((bullet) => (
						<li
							key={bullet}
							className="flex items-start gap-2 text-muted-foreground text-sm"
						>
							<CheckIcon
								aria-hidden
								className={cn("mt-0.5 size-4 shrink-0", accentClass)}
							/>
							<span>{bullet}</span>
						</li>
					))}
				</ul>
			</div>
		</motion.div>
	);
}

function DuoModelBlock({
	models,
	shouldReduceMotion,
}: {
	models: readonly AboutModel[];
	shouldReduceMotion: boolean;
}) {
	return (
		<div className="mt-16 grid gap-6 md:mt-20 md:grid-cols-2">
			{models.map((model, index) => (
				<DuoModelCard
					key={model.title}
					fromLeft={index === 0}
					model={model}
					shouldReduceMotion={shouldReduceMotion}
				/>
			))}
		</div>
	);
}

function ValuesBlock({
	title,
	values,
	shouldReduceMotion,
}: {
	title: string;
	values: readonly AboutValue[];
	shouldReduceMotion: boolean;
}) {
	const containerVariants: Variants = {
		hidden: {},
		visible: {
			transition: {
				staggerChildren: shouldReduceMotion ? 0 : 0.1,
			},
		},
	};

	const itemVariants: Variants = {
		hidden: shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 },
		visible: {
			opacity: 1,
			y: 0,
			transition: { duration: shouldReduceMotion ? 0 : 0.5 },
		},
	};

	return (
		<div className="mt-16 md:mt-20">
			<motion.h2
				className="mb-8 text-center font-heading text-2xl tracking-tight md:mb-10 md:text-3xl"
				initial={
					shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
				}
				transition={
					shouldReduceMotion
						? { duration: 0 }
						: { duration: 0.5, ease: easeOut }
				}
				viewport={{ once: true }}
				whileInView={{ opacity: 1, y: 0 }}
			>
				{title}
			</motion.h2>
			<motion.div
				className="grid grid-cols-2 gap-6 md:grid-cols-4"
				initial="hidden"
				variants={containerVariants}
				viewport={{ once: true }}
				whileInView="visible"
			>
				{values.map((value) => {
					const Icon = iconMap[value.icon as keyof typeof iconMap];
					return (
						<motion.div
							key={value.title}
							className="flex flex-col items-center gap-3 text-center"
							variants={itemVariants}
						>
							<div className="flex size-12 items-center justify-center rounded-lg bg-primary/10">
								{Icon ? (
									<Icon aria-hidden className="size-8 text-primary" />
								) : null}
							</div>
							<h3 className="font-medium text-sm">{value.title}</h3>
							<p className="text-muted-foreground text-xs md:text-sm">
								{value.description}
							</p>
						</motion.div>
					);
				})}
			</motion.div>
		</div>
	);
}

export function AboutSection() {
	const messages = useMessages();
	const about = messages.home.about;
	const shouldReduceMotion = useReducedMotion() ?? false;

	return (
		<section
			aria-labelledby="about-heading"
			className="mx-auto w-full max-w-5xl overflow-hidden px-4 pt-8 pb-24 md:pt-12 md:pb-32"
			id="sobre"
		>
			<MissionBlock
				badge={about.badge}
				description={about.description}
				shouldReduceMotion={shouldReduceMotion}
				title={about.title}
			/>
			<DuoModelBlock
				models={about.models}
				shouldReduceMotion={shouldReduceMotion}
			/>
			<ValuesBlock
				shouldReduceMotion={shouldReduceMotion}
				title={about.valuesTitle}
				values={about.values}
			/>
		</section>
	);
}
