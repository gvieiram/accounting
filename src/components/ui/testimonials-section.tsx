"use client";

import { motion } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

type Testimonial = {
	quote: string;
	name: string;
	company: string;
	initials: string;
};

const featured: Testimonial = {
	quote:
		"A Effer transformou completamente a gestão financeira da nossa empresa. " +
		"Antes, passávamos horas lidando com burocracia contábil. Agora, temos " +
		"tudo organizado em uma plataforma digital e podemos focar no que " +
		"realmente importa: crescer o negócio. O atendimento personalizado faz " +
		"toda a diferença.",
	name: "Ricardo Almeida",
	company: "CEO, TechFlow Soluções",
	initials: "RA",
};

const medium1: Testimonial = {
	quote:
		"Profissionalismo e agilidade. Resolveram a regularização da minha " +
		"empresa em tempo recorde.",
	name: "Fernanda Costa",
	company: "Arquiteta autônoma",
	initials: "FC",
};

const medium2: Testimonial = {
	quote:
		"O planejamento tributário que fizeram economizou mais de 30% nos " +
		"impostos do meu negócio. Recomendo demais!",
	name: "Marcos Silva",
	company: "Diretor, Silva & Associados",
	initials: "MS",
};

const small1: Testimonial = {
	quote:
		"Atendimento nota 10. Sempre disponíveis quando preciso tirar dúvidas.",
	name: "Juliana Rocha",
	company: "Loja Bella Moda",
	initials: "JR",
};

const small2: Testimonial = {
	quote:
		"Finalmente encontrei um escritório que entende as necessidades de " +
		"uma startup.",
	name: "Lucas Mendonça",
	company: "Co-founder, DevSpace",
	initials: "LM",
};

const quoteIcon = (
	<svg
		width="48"
		height="36"
		viewBox="0 0 48 36"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		className="text-muted-foreground/30"
		aria-hidden
	>
		<title>Ícone decorativo de aspas</title>
		<path
			d="M14.9951 36C12.4951 36 10.2285 35.0167 8.19513 33.05C6.1618 31.0833 5.14513 28.8333 5.14513 26.3C5.14513 22.8 6.2118 19.4833 8.34513 16.35C10.4785 13.2167 13.2285 10.1 16.5951 7L21.4951 11.25C19.3618 13.1333 17.6785 14.8833 16.4451 16.5C15.2118 18.1167 14.5951 19.9833 14.5951 22.1H19.9951V36H14.9951ZM37.9951 36C35.4951 36 33.2285 35.0167 31.1951 33.05C29.1618 31.0833 28.1451 28.8333 28.1451 26.3C28.1451 22.8 29.2118 19.4833 31.3451 16.35C33.4785 13.2167 36.2285 10.1 39.5951 7L44.4951 11.25C42.3618 13.1333 40.6785 14.8833 39.4451 16.5C38.2118 18.1167 37.5951 19.9833 37.5951 22.1H42.9951V36H37.9951Z"
			fill="currentColor"
		/>
	</svg>
);

const containerVariants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: { staggerChildren: 0.15 },
	},
};

const itemVariants = {
	hidden: { opacity: 0, y: 20 },
	visible: { opacity: 1, y: 0 },
};

function TestimonialCard({
	testimonial,
	className,
}: {
	testimonial: Testimonial;
	className?: string;
}) {
	return (
		<Card className={className}>
			<CardContent className="flex h-full flex-col p-4 sm:p-6">
				<blockquote className="mb-4 grow text-muted-foreground text-sm leading-relaxed">
					{testimonial.quote}
				</blockquote>
				<div className="flex items-center gap-3">
					<Avatar className="size-12 shrink-0">
						<AvatarFallback>{testimonial.initials}</AvatarFallback>
					</Avatar>
					<div>
						<p className="font-medium text-sm">{testimonial.name}</p>
						<p className="text-muted-foreground text-xs">
							{testimonial.company}
						</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function FeaturedTestimonialCard({
	testimonial,
}: {
	testimonial: Testimonial;
}) {
	return (
		<Card className="grid h-full grid-rows-[auto_1fr] gap-8 p-4 sm:p-6">
			<div className="text-muted-foreground/30 [&>svg]:size-12">
				{quoteIcon}
			</div>
			<div className="flex min-h-0 flex-col">
				<blockquote className="mb-4 grow text-muted-foreground text-sm leading-relaxed md:text-base">
					{testimonial.quote}
				</blockquote>
				<div className="flex items-center gap-3">
					<Avatar className="size-12 shrink-0">
						<AvatarFallback>{testimonial.initials}</AvatarFallback>
					</Avatar>
					<div>
						<p className="font-medium text-sm">{testimonial.name}</p>
						<p className="text-muted-foreground text-xs">
							{testimonial.company}
						</p>
					</div>
				</div>
			</div>
		</Card>
	);
}

export function TestimonialsSection() {
	return (
		<section className="mx-auto w-full max-w-6xl border-t py-20 md:py-32">
			<motion.div
				className="mx-auto max-w-2xl px-4 text-center"
				initial={{ opacity: 0, y: 20 }}
				whileInView={{ opacity: 1, y: 0 }}
				viewport={{ once: true, amount: 0.2 }}
				transition={{ duration: 0.5 }}
			>
				<h2 className="mb-4 font-heading text-3xl tracking-tight md:text-4xl">
					O que nossos clientes dizem
				</h2>
				<p className="text-muted-foreground">
					Conheça a experiência de quem confia na Effer para cuidar da
					contabilidade do negócio.
				</p>
			</motion.div>

			<motion.div
				className="mt-16 grid gap-4 px-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-rows-3"
				variants={containerVariants}
				initial="hidden"
				whileInView="visible"
				viewport={{ once: true, amount: 0.2 }}
			>
				<motion.div
					variants={itemVariants}
					className="sm:col-span-2 lg:row-span-2"
				>
					<FeaturedTestimonialCard testimonial={featured} />
				</motion.div>

				<motion.div variants={itemVariants} className="md:col-span-2">
					<TestimonialCard testimonial={medium1} />
				</motion.div>

				<motion.div variants={itemVariants} className="md:col-span-2">
					<TestimonialCard testimonial={medium2} />
				</motion.div>

				<motion.div variants={itemVariants}>
					<TestimonialCard testimonial={small1} />
				</motion.div>

				<motion.div variants={itemVariants}>
					<TestimonialCard testimonial={small2} />
				</motion.div>
			</motion.div>
		</section>
	);
}
