"use client";

import Link from "next/link";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ_ITEMS = [
	{
		id: "item-1",
		question: "Como funciona a contabilidade digital da Effer?",
		answer:
			"Nossa plataforma permite que você acompanhe toda a gestão contábil da sua empresa em tempo real. Cuidamos da escrituração, obrigações fiscais e tributárias, enquanto você acessa relatórios e documentos de qualquer lugar. Combinamos tecnologia com atendimento humano para oferecer a melhor experiência.",
	},
	{
		id: "item-2",
		question: "Quais documentos preciso para abrir minha empresa?",
		answer:
			"Para a abertura de empresa, geralmente precisamos de: RG e CPF dos sócios, comprovante de endereço, definição da atividade econômica (CNAE) e do tipo societário. Nossa equipe orienta você em cada etapa e cuida de toda a documentação junto aos órgãos competentes.",
	},
	{
		id: "item-3",
		question: "Qual o prazo para regularizar minha situação fiscal?",
		answer:
			"O prazo varia conforme a complexidade da situação. Pendências simples podem ser resolvidas em poucos dias, enquanto casos mais complexos podem levar algumas semanas. Após uma análise inicial gratuita, informamos o prazo estimado e o plano de ação.",
	},
	{
		id: "item-4",
		question: "Vocês atendem MEI?",
		answer:
			"Sim! Atendemos desde MEI até empresas de médio porte. Para o MEI, oferecemos um plano especial que inclui a declaração anual (DASN-SIMEI), controle de faturamento e orientação para desenquadramento quando necessário.",
	},
	{
		id: "item-5",
		question: "Como funciona o atendimento por WhatsApp?",
		answer:
			"Nosso atendimento por WhatsApp é rápido e direto. Você pode enviar documentos, tirar dúvidas e receber orientações em tempo real. Para questões mais complexas, agendamos uma reunião virtual. O WhatsApp é nosso canal principal de comunicação com os clientes.",
	},
	{
		id: "item-6",
		question: "Quanto custa o serviço de contabilidade?",
		answer:
			"Os valores variam de acordo com o porte da empresa, regime tributário e serviços contratados. Oferecemos planos a partir de R$ 199/mês para MEI e valores personalizados para empresas maiores. Entre em contato para receber uma proposta sob medida.",
	},
];

const WHATSAPP_URL =
	"https://wa.me/5511999999999?text=Olá! Não encontrei o que procurava nas perguntas frequentes. Podem me ajudar?";

export function FaqSection() {
	return (
		<section className="mx-auto w-full max-w-3xl px-6 py-20 md:px-8 md:py-32">
			<div className="flex flex-col gap-6">
				<h2 className="font-heading font-semibold text-3xl md:text-4xl">
					Perguntas frequentes
				</h2>
				<p className="text-muted-foreground">
					Tire suas dúvidas sobre nossos serviços de contabilidade. Se não
					encontrar o que procura, entre em contato.
				</p>
				<div className="-space-y-px rounded-lg bg-card dark:bg-card/50">
					<Accordion collapsible defaultValue="item-1" type="single">
						{FAQ_ITEMS.map((item) => (
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
					Não encontrou o que procura? Fale com{" "}
					<Link
						href={WHATSAPP_URL}
						target="_blank"
						rel="noopener noreferrer"
						className="text-primary hover:underline"
					>
						nosso time
					</Link>
				</p>
			</div>
		</section>
	);
}
