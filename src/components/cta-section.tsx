"use client";

import { MessageCircleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCompany, useMessages } from "@/stores/use-content-store";

const formFieldClassName =
	"bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50";

export function CtaSection() {
	const messages = useMessages();
	const company = useCompany();
	const cta = messages.home.cta;
	const whatsappUrl = company.links.whatsappUrl(cta.whatsappText);

	return (
		<section id="contato" className="mx-auto max-w-5xl px-4 py-20 md:py-32">
			<div className="rounded-3xl bg-primary px-6 py-12 text-primary-foreground md:px-12 md:py-16">
				<div className="flex flex-col gap-12 md:grid md:grid-cols-2 md:items-center md:gap-16">
					{/* Left column */}
					<div className="flex flex-col gap-6">
						<h2 className="font-heading font-semibold text-3xl md:text-4xl">
							{cta.title}
						</h2>
						<p className="text-primary-foreground/90">{cta.description}</p>
						<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
							<Button
								asChild
								className="bg-[#25D366] text-white hover:bg-[#25D366]/90"
								size="lg"
							>
								<a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
									<MessageCircleIcon className="size-5" />
									{messages.common.actions.talkOnWhatsapp}
								</a>
							</Button>
							<Button
								variant="outline"
								size="lg"
								className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
								onClick={() => {
									document
										.getElementById("contato")
										?.querySelector("form")
										?.scrollIntoView({ behavior: "smooth" });
								}}
							>
								{messages.common.actions.scheduleConsultation}
							</Button>
						</div>
					</div>

					{/* Right column - Form */}
					<form
						onSubmit={(e) => e.preventDefault()}
						className="flex flex-col gap-4"
					>
						<Input
							type="text"
							placeholder={cta.form.namePlaceholder}
							required
							className={formFieldClassName}
						/>
						<Input
							type="email"
							placeholder={cta.form.emailPlaceholder}
							required
							className={formFieldClassName}
						/>
						<Input
							type="tel"
							placeholder={cta.form.phonePlaceholder}
							className={formFieldClassName}
						/>
						<Textarea
							placeholder={cta.form.messagePlaceholder}
							rows={3}
							className={formFieldClassName}
						/>
						<Button
							type="submit"
							className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
						>
							{cta.form.submitLabel}
						</Button>
					</form>
				</div>
			</div>
		</section>
	);
}
