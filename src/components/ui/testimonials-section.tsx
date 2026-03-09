"use client";

import { motion, useAnimationFrame, useMotionValue } from "framer-motion";
import Image from "next/image";
import React, { useCallback, useRef, useState } from "react";

interface Testimonial {
	text: string;
	image: string;
	name: string;
	role: string;
}

const testimonials: Testimonial[] = [
	{
		text: "A Effer transformou a gestão financeira da nossa empresa. Antes perdíamos horas com burocracia contábil, agora temos tudo organizado e podemos focar no crescimento do negócio.",
		image:
			"https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150&h=150",
		name: "Camila Ferreira",
		role: "Diretora de Operações",
	},
	{
		text: "O planejamento tributário que fizeram economizou mais de 30% nos impostos. Profissionalismo e agilidade que fazem a diferença.",
		image:
			"https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150&h=150",
		name: "Ricardo Almeida",
		role: "CEO, TechFlow Soluções",
	},
	{
		text: "O atendimento é nota 10. Sempre disponíveis quando preciso tirar dúvidas, e a plataforma digital facilita muito o acompanhamento.",
		image:
			"https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150&h=150",
		name: "Juliana Rocha",
		role: "Proprietária, Loja Bella Moda",
	},
	{
		text: "Finalmente encontrei um escritório que entende as necessidades de uma startup. A consultoria sob demanda é perfeita pro nosso momento.",
		image:
			"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150&h=150",
		name: "Lucas Mendonça",
		role: "Co-founder, DevSpace",
	},
	{
		text: "A regularização da minha empresa foi resolvida em tempo recorde. Processos ágeis e sem dor de cabeça.",
		image:
			"https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150&h=150",
		name: "Fernanda Costa",
		role: "Arquiteta Autônoma",
	},
	{
		text: "A abertura da minha empresa foi muito mais simples do que eu imaginava. A equipe cuidou de tudo, do CNPJ à licença de funcionamento.",
		image:
			"https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150&h=150",
		name: "Mariana Santos",
		role: "Nutricionista",
	},
	{
		text: "Relatórios financeiros claros e objetivos que me ajudam a tomar decisões estratégicas com confiança.",
		image:
			"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150&h=150",
		name: "Marcos Silva",
		role: "Diretor, Silva & Associados",
	},
	{
		text: "A gestão de folha de pagamento ficou impecável. Zero erros e sempre no prazo, mesmo com o crescimento do time.",
		image:
			"https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150&h=150",
		name: "Ana Paula Vieira",
		role: "Gerente de RH",
	},
	{
		text: "Migrei de outro escritório e a diferença é gritante. Transparência, tecnologia e um atendimento realmente humano.",
		image:
			"https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150&h=150",
		name: "Thiago Rezende",
		role: "Sócio, Rezende Consultoria",
	},
];

const firstColumn = testimonials.slice(0, 3);
const secondColumn = testimonials.slice(3, 6);
const thirdColumn = testimonials.slice(6, 9);

function TestimonialsColumn({
	className,
	testimonials,
	duration = 10,
	isPaused,
	onCardHover,
	onCardLeave,
}: {
	className?: string;
	testimonials: Testimonial[];
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
											alt={`Foto de ${name}`}
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
							Depoimentos
						</div>
					</div>

					<h2
						id="testimonials-heading"
						className="mt-6 text-center font-heading text-3xl text-foreground tracking-tight md:text-4xl"
					>
						O que nossos clientes dizem
					</h2>
					<p className="mt-5 max-w-sm text-center text-lg text-muted-foreground leading-relaxed">
						Conheça a experiência de quem confia na Effer para cuidar da
						contabilidade do negócio.
					</p>
				</div>

				<section
					className="mt-10 flex max-h-[740px] justify-center gap-6 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)]"
					aria-label="Depoimentos em rolagem"
				>
					<TestimonialsColumn
						testimonials={firstColumn}
						duration={15}
						isPaused={isPaused}
						onCardHover={onCardHover}
						onCardLeave={onCardLeave}
					/>
					<TestimonialsColumn
						testimonials={secondColumn}
						className="hidden md:block"
						duration={19}
						isPaused={isPaused}
						onCardHover={onCardHover}
						onCardLeave={onCardLeave}
					/>
					<TestimonialsColumn
						testimonials={thirdColumn}
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
