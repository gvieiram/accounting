"use client";

import Link from "next/link";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { useCompany, useMessages } from "@/stores/use-content-store";

export function FaqSection() {
	const messages = useMessages();
	const company = useCompany();
	const faq = messages.home.faq;
	const whatsappUrl = company.links.whatsappUrl(faq.whatsappFallback.text);

	return (
		<section className="mx-auto w-full max-w-4xl px-6 py-20 md:px-8 lg:py-14">
			<div className="flex flex-col gap-6">
				<h2 className="text-center font-heading text-3xl tracking-tight md:text-4xl lg:text-5xl">
					{faq.title}
				</h2>
				<p className="text-center text-muted-foreground">{faq.description}</p>
				<div className="-space-y-px rounded-lg bg-card dark:bg-card/50">
					<Accordion collapsible defaultValue="item-1" type="single">
						{faq.items.map((item) => (
							<AccordionItem
								key={item.id}
								value={item.id}
								className="border-x first:rounded-t-lg first:border-t last:rounded-b-lg last:border-b"
							>
								<AccordionTrigger className="px-4 py-4 text-[15px] leading-6 hover:no-underline">
									{item.question}
								</AccordionTrigger>
								<AccordionContent className="px-4 pb-4 text-muted-foreground">
									{item.answer}
								</AccordionContent>
							</AccordionItem>
						))}
					</Accordion>
				</div>
				<p className="flex flex-col items-center text-center text-muted-foreground text-sm">
					<span>{faq.whatsappFallback.firstLine}</span>
					<span>
						{faq.whatsappFallback.secondLinePrefix}
						<Link
							href={whatsappUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="font-medium text-primary hover:underline"
						>
							{faq.whatsappFallback.linkLabel}
						</Link>
					</span>
				</p>
			</div>
		</section>
	);
}
