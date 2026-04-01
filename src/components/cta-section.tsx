"use client";

import { SiWhatsapp } from "@icons-pack/react-simple-icons";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useCompany, useMessages } from "@/stores/use-content-store";

const STAGGER_DELAY = 0.15;
const easeOut = [0.25, 0.46, 0.45, 0.94] as const;

function DotPattern() {
	return (
		<div
			aria-hidden="true"
			className="pointer-events-none absolute inset-0 opacity-[0.07]"
			style={{
				backgroundImage:
					"radial-gradient(circle, currentColor 1px, transparent 1px)",
				backgroundSize: "24px 24px",
			}}
		/>
	);
}

export function CtaSection() {
	const messages = useMessages();
	const company = useCompany();
	const cta = messages.home.cta;
	const whatsappUrl = company.links.whatsappUrl(cta.whatsappText);
	const shouldReduceMotion = useReducedMotion() ?? false;

	const hidden = shouldReduceMotion
		? { opacity: 1, y: 0 }
		: { opacity: 0, y: 24 };
	const visible = { opacity: 1, y: 0 };
	const baseTransition = (step: number) =>
		shouldReduceMotion
			? { duration: 0 }
			: {
					duration: 0.5,
					ease: easeOut,
					delay: step * STAGGER_DELAY,
				};

	return (
		<section
			aria-labelledby="cta-heading"
			id="contato"
			className="mx-auto max-w-5xl px-4 py-20 md:py-32"
		>
			<div className="relative overflow-hidden rounded-3xl bg-primary px-8 py-16 text-center text-primary-foreground md:px-16 md:py-20">
				<DotPattern />

				<div className="relative flex flex-col items-center gap-6">
					<motion.h2
						className="font-heading font-semibold text-3xl md:text-4xl lg:text-5xl"
						id="cta-heading"
						initial={hidden}
						transition={baseTransition(0)}
						viewport={{ once: true }}
						whileInView={visible}
					>
						{cta.title}
					</motion.h2>

					<motion.p
						className="mx-auto max-w-2xl text-primary-foreground/80"
						initial={hidden}
						transition={baseTransition(1)}
						viewport={{ once: true }}
						whileInView={visible}
					>
						{cta.description}
					</motion.p>

					<motion.div
						initial={hidden}
						transition={baseTransition(2)}
						viewport={{ once: true }}
						whileInView={visible}
					>
						<Button
							asChild
							className="h-14 rounded-full bg-whatsapp px-8 text-lg text-whatsapp-foreground transition-transform hover:scale-[1.02] hover:bg-whatsapp/90 has-[>svg]:px-8"
						>
							<a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
								<SiWhatsapp className="size-5" color="currentColor" />
								{messages.common.actions.talkOnWhatsapp}
							</a>
						</Button>
					</motion.div>
				</div>
			</div>
		</section>
	);
}
