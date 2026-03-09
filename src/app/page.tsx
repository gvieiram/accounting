import { AboutSection } from "@/components/ui/about-section";
import { CtaSection } from "@/components/ui/cta-section";
import { FaqSection } from "@/components/ui/faq-section";
import type { FeatureCardData } from "@/components/ui/feature-section";
import { StackedFeatures } from "@/components/ui/feature-section";
import { Footer } from "@/components/ui/footer";
import { HeroSection, LogosSection } from "@/components/ui/hero";
import { TestimonialsSection } from "@/components/ui/testimonials-section";

const features: FeatureCardData[] = [
	{
		badge: "Nossos serviços",
		title: "Serviços contábeis completos para o seu negócio",
		description:
			"A Effer cuida de toda a gestão contábil da sua empresa, desde a escrituração até o planejamento tributário, para que você foque no crescimento do seu negócio.",
		accentClassName: "bg-stack-1 border-stack-1",
		bullets: [
			{
				title: "Gestão fiscal e tributária",
				description:
					"Planejamento tributário estratégico para reduzir custos e manter conformidade.",
			},
			{
				title: "Escrituração contábil",
				description:
					"Registro completo e organizado de todas as movimentações financeiras.",
			},
			{
				title: "Abertura e regularização de empresas",
				description:
					"Do CNPJ à licença de funcionamento, cuidamos de toda a burocracia.",
			},
			{
				title: "Folha de pagamento e DP",
				description:
					"Gestão de colaboradores, encargos e obrigações trabalhistas.",
			},
		],
		cta: {
			label: "Conheça nossos serviços",
			href: "#servicos",
		},
	},
	{
		badge: "Por que nos escolher",
		title: "Tecnologia e proximidade em cada detalhe",
		description:
			"Combinamos uma plataforma digital moderna com atendimento humano e próximo. Você acompanha tudo online e conta com especialistas sempre disponíveis.",
		accentClassName: "bg-stack-2 border-stack-2",
		bullets: [
			{
				title: "Plataforma 100% digital",
				description:
					"Acompanhe sua contabilidade em tempo real, de qualquer lugar.",
			},
			{
				title: "Atendimento personalizado",
				description:
					"Especialistas dedicados que conhecem o seu negócio a fundo.",
			},
			{
				title: "Processos ágeis",
				description:
					"Sem burocracia desnecessária — resolvemos com rapidez e eficiência.",
			},
		],
		cta: {
			label: "Fale com um especialista",
			href: "#contato",
			variant: "secondary",
		},
	},
	{
		badge: "Resultados reais",
		title: "Foque no que importa, a gente cuida do resto",
		description:
			"Deixe a burocracia contábil com quem entende. Liberamos seu tempo para que você possa se dedicar ao que realmente faz o seu negócio crescer.",
		accentClassName: "bg-stack-3 border-stack-3",
		bullets: [
			{
				title: "Economia de tempo",
				description:
					"Sem dor de cabeça com burocracia — a gente resolve pra você.",
			},
			{
				title: "Conformidade garantida",
				description: "Sempre em dia com o fisco, sem surpresas ou multas.",
			},
			{
				title: "Decisões baseadas em dados",
				description:
					"Relatórios financeiros claros para orientar suas estratégias.",
			},
		],
		cta: {
			label: "Começar agora",
			href: "#comecar",
		},
	},
];

export default function Home() {
	return (
		<div className="flex w-full flex-col">
			<main className="grow">
				<HeroSection />
				<LogosSection />
				<StackedFeatures features={features} />
				<AboutSection />
				<TestimonialsSection />
				<FaqSection />
				<CtaSection />
			</main>
			<Footer />
		</div>
	);
}
