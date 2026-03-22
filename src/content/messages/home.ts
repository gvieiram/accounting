import type { FeatureCardData } from "@/components/feature-section";
import { company } from "../company";

export const home = {
	hero: {
		kicker: "Plataforma 100% digital",
		kickerHref: "#link",
		title: "Contabilidade moderna \n para o seu negócio",
		description:
			"Gestão fiscal, tributária e financeira \n com tecnologia e atendimento especializado",
		primaryCta: {
			label: "Começar agora",
		},
		secondaryCta: {
			label: "Fale conosco",
		},
	},
	logos: {
		titlePrefix: "Confiança de quem ",
		titleEmphasis: "entende",
	},
	features: [
		{
			badge: "Nossos serviços",
			title: "Serviços contábeis completos para o seu negócio",
			description:
				"A DuoHub cuida de toda a gestão contábil da sua empresa, desde a escrituração até o planejamento tributário, para que você foque no crescimento do seu negócio.",
			// accentClassName: "bg-muted border-muted",
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
			illustration: "/illustrations/services.png",
			illustrationAlt: "Ilustração de documentos financeiros organizados",
		},
		{
			badge: "Por que nos escolher",
			title: "Tecnologia e proximidade em cada detalhe",
			description:
				"Combinamos uma plataforma digital moderna com atendimento humano e próximo. Você acompanha tudo online e conta com especialistas sempre disponíveis.",
			// accentClassName: "bg-muted border-muted",
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
			},
			illustration: "/illustrations/why-choose-us.png",
			illustrationAlt:
				"Ilustração de um computador com um gráfico de satisfação dos clientes",
		},
		{
			badge: "Resultados reais",
			title: "Foque no que importa, a gente cuida do resto",
			description:
				"Deixe a burocracia contábil com quem entende. Liberamos seu tempo para que você possa se dedicar ao que realmente faz o seu negócio crescer.",
			// accentClassName: "bg-muted border-muted",
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
			illustration: "/illustrations/results.png",
			illustrationAlt: "Ilustração de um gráfico de resultados financeiros",
		},
	] satisfies FeatureCardData[],
	about: {
		badge: "Sobre a DuoHub",
		title: "Contabilidade que acompanha o ritmo do seu negócio",
		description:
			"Nascemos para simplificar a gestão contábil de micro e pequenos empreendedores. Combinamos tecnologia e atendimento humano para que você foque no que realmente importa: fazer o seu negócio crescer.",
		models: [
			{
				title: "Contabilidade Contínua",
				description:
					"Acompanhamento recorrente e completo para quem precisa de gestão contábil integral, do dia a dia ao planejamento estratégico.",
				icon: "RefreshCw",
				accentColor: "primary" as const,
				bullets: [
					"Escrituração contábil completa",
					"Gestão fiscal e tributária",
					"Folha de pagamento e DP",
					"Obrigações acessórias",
				],
			},
			{
				title: "Consultoria Sob Demanda",
				description:
					"Soluções pontuais e ágeis para quem busca resultados específicos, sem compromisso de longo prazo.",
				icon: "Zap",
				accentColor: "highlight" as const,
				bullets: [
					"Planejamento tributário",
					"Abertura e regularização de empresas",
					"Consultoria contábil pontual",
					"Diagnóstico financeiro",
				],
			},
		],
		values: [
			{
				title: "Tecnologia",
				description: "Plataforma 100% digital e acessível de qualquer lugar",
				icon: "Monitor",
			},
			{
				title: "Proximidade",
				description: "Atendimento humano que entende o seu negócio",
				icon: "HeartHandshake",
			},
			{
				title: "Agilidade",
				description: "Processos enxutos, sem burocracia desnecessária",
				icon: "Zap",
			},
			{
				title: "Transparência",
				description: "Você sabe exatamente o que está acontecendo",
				icon: "ShieldCheck",
			},
		],
	},
	testimonials: {
		badge: "Depoimentos",
		title: "O que nossos clientes dizem",
		description:
			"Conheça a experiência de quem confia na DuoHub para cuidar da contabilidade do negócio.",
		items: [
			{
				text: "A DuoHub transformou a gestão financeira da nossa empresa. Antes perdíamos horas com burocracia contábil, agora temos tudo organizado e podemos focar no crescimento do negócio.",
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
					"https://images.unsplash.com/photo-1544005313-94ddf0286df2d?auto=format&fit=crop&q=80&w=150&h=150",
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
		],
	},
	faq: {
		title: "Perguntas frequentes",
		description:
			"Tire suas dúvidas sobre nossos serviços de contabilidade. Se não encontrar o que procura, entre em contato.",
		items: [
			{
				id: "item-1",
				question: "Como funciona a contabilidade digital da DuoHub?",
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
		],
		whatsappFallback: {
			text: "Olá! Não encontrei o que procurava nas perguntas frequentes. Podem me ajudar?",
			linkLabel: "nosso time",
			prefix: "Não encontrou o que procura? Fale com ",
		},
	},
	cta: {
		title: "Pronto para simplificar sua contabilidade?",
		description:
			"Entre em contato agora e descubra como podemos ajudar o seu negócio a crescer com tranquilidade.",
		whatsappText: "Olá! Gostaria de saber mais sobre os serviços da DuoHub.",
		form: {
			namePlaceholder: "Nome",
			emailPlaceholder: "E-mail",
			phonePlaceholder: "Telefone",
			messagePlaceholder: "Mensagem (opcional)",
			submitLabel: "Enviar",
		},
	},
	footer: {
		ariaLabelHome: `${company.brand.name} - Página inicial`,
		copyright: `© 2026 ${company.brand.name}. Todos os direitos reservados.`,
	},
	header: {
		links: [
			{ label: "Serviços", href: "#" },
			{ label: "Planos", href: "#" },
			{ label: "Sobre", href: "#" },
		],
		desktopCtas: {
			login: "Entrar",
			start: "Começar",
		},
	},
} as const;

export type HomeTestimonial = (typeof home.testimonials.items)[number];
