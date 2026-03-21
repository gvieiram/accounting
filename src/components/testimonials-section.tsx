"use client";

import { motion, useAnimationFrame, useMotionValue } from "framer-motion";
import Image from "next/image";
import React, { useCallback, useRef, useState } from "react";
import type { HomeTestimonial } from "@/content/messages/home";
import { useMessages } from "@/stores/use-content-store";

function TestimonialsColumn({
	className,
	testimonials,
	photoAlt,
	duration = 10,
	isPaused,
	onCardHover,
	onCardLeave,
}: {
	className?: string;
	testimonials: readonly HomeTestimonial[];
	photoAlt: (name: string) => string;
	duration?: number;
	isPaused: boolean;
	onCardHover: () => void;
	onCardLeave: () => void;
}) {
	const listRef = useRef<HTMLUListElement>(null);
	const y = useMotionValue(0);

	useAnimationFrame((_, delta) => {
		if (isPaused || !listRef.current) return;
		const halfHeight = listRef.current.scrollHeight / 2;
		const speed = halfHeight / (duration * 1000);
		const next = y.get() - speed * delta;
		y.set(next <= -halfHeight ? next + halfHeight : next);
	});

	return (
		<div className={className}>
			<motion.ul
				ref={listRef}
				style={{ y }}
				className="m-0 flex list-none flex-col gap-6 p-0 pb-6"
			>
				{[...Array(2)].map((_, index) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: intentional duplication for infinite scroll
					<React.Fragment key={index}>
						{testimonials.map(({ text, image, name, role }) => (
							<motion.li
								key={`${index}-${name}`}
								aria-hidden={index === 1 ? "true" : "false"}
								tabIndex={index === 1 ? -1 : 0}
								onHoverStart={onCardHover}
								onHoverEnd={onCardLeave}
								onFocus={onCardHover}
								onBlur={onCardLeave}
								whileHover={{
									scale: 1.03,
									y: -8,
									transition: {
										type: "spring",
										stiffness: 400,
										damping: 17,
									},
								}}
								whileFocus={{
									scale: 1.03,
									y: -8,
									transition: {
										type: "spring",
										stiffness: 400,
										damping: 17,
									},
								}}
								className="group w-full max-w-xs cursor-default select-none rounded-2xl border border-border bg-card p-8 shadow-black/5 shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/30"
							>
								<blockquote className="m-0 p-0">
									<p className="m-0 font-normal text-muted-foreground leading-relaxed">
										{text}
									</p>
									<footer className="mt-6 flex items-center gap-3">
										<Image
											width={40}
											height={40}
											src={image}
											alt={photoAlt(name)}
											className="h-10 w-10 rounded-full object-cover ring-2 ring-muted transition-all duration-300 ease-in-out group-hover:ring-primary/30"
										/>
										<div className="flex flex-col">
											<cite className="font-semibold text-foreground not-italic leading-5 tracking-tight">
												{name}
											</cite>
											<span className="mt-0.5 text-muted-foreground text-sm leading-5 tracking-tight">
												{role}
											</span>
										</div>
									</footer>
								</blockquote>
							</motion.li>
						))}
					</React.Fragment>
				))}
			</motion.ul>
		</div>
	);
}

export function TestimonialsSection({
	pauseOnHover = false,
}: {
	pauseOnHover?: boolean;
} = {}) {
	const messages = useMessages();
	const testimonials = messages.home.testimonials.items;
	const firstColumn = testimonials.slice(0, 3);
	const secondColumn = testimonials.slice(3, 6);
	const thirdColumn = testimonials.slice(6, 9);

	const [isPaused, setIsPaused] = useState(false);
	const pauseTimer = useRef<ReturnType<typeof setTimeout>>(null);

	const onCardHover = useCallback(() => {
		if (!pauseOnHover) return;
		pauseTimer.current = setTimeout(() => setIsPaused(true), 500);
	}, [pauseOnHover]);

	const onCardLeave = useCallback(() => {
		if (!pauseOnHover) return;
		if (pauseTimer.current) clearTimeout(pauseTimer.current);
		setIsPaused(false);
	}, [pauseOnHover]);

	return (
		<section
			aria-labelledby="testimonials-heading"
			className="relative overflow-hidden py-20 md:py-32"
		>
			<motion.div
				initial={{ opacity: 0, y: 50, rotate: -2 }}
				whileInView={{ opacity: 1, y: 0, rotate: 0 }}
				viewport={{ once: true, amount: 0.15 }}
				transition={{
					duration: 1.2,
					ease: [0.16, 1, 0.3, 1],
					opacity: { duration: 0.8 },
				}}
				className="container z-10 mx-auto px-4"
			>
				<div className="mx-auto mb-16 flex max-w-[540px] flex-col items-center justify-center">
					<div className="flex justify-center">
						<div className="rounded-full border border-border bg-muted/50 px-4 py-1 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
							{messages.home.testimonials.badge}
						</div>
					</div>

					<h2
						id="testimonials-heading"
						className="mt-6 text-center font-heading text-3xl text-foreground tracking-tight md:text-4xl"
					>
						{messages.home.testimonials.title}
					</h2>
					<p className="mt-5 max-w-sm text-center text-lg text-muted-foreground leading-relaxed">
						{messages.home.testimonials.description}
					</p>
				</div>

				<section
					className="mt-10 flex max-h-[740px] justify-center gap-6 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)]"
					aria-label={messages.common.a11y.testimonialsScroll}
				>
					<TestimonialsColumn
						testimonials={firstColumn}
						photoAlt={messages.common.a11y.photoOf}
						duration={15}
						isPaused={isPaused}
						onCardHover={onCardHover}
						onCardLeave={onCardLeave}
					/>
					<TestimonialsColumn
						testimonials={secondColumn}
						photoAlt={messages.common.a11y.photoOf}
						className="hidden md:block"
						duration={19}
						isPaused={isPaused}
						onCardHover={onCardHover}
						onCardLeave={onCardLeave}
					/>
					<TestimonialsColumn
						testimonials={thirdColumn}
						photoAlt={messages.common.a11y.photoOf}
						className="hidden lg:block"
						duration={17}
						isPaused={isPaused}
						onCardHover={onCardHover}
						onCardLeave={onCardLeave}
					/>
				</section>
			</motion.div>
		</section>
	);
}
