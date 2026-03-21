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
		<section className="mx-auto w-full max-w-3xl px-6 py-20 md:px-8 md:py-32">
			<div className="flex flex-col gap-6">
				<h2 className="font-heading font-semibold text-3xl md:text-4xl">
					{faq.title}
				</h2>
				<p className="text-muted-foreground">{faq.description}</p>
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
				<p className="text-center text-muted-foreground text-sm">
					{faq.whatsappFallback.prefix}{" "}
					<Link
						href={whatsappUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="text-primary hover:underline"
					>
						{faq.whatsappFallback.linkLabel}
					</Link>
				</p>
			</div>
		</section>
	);
}
