import type { FeatureCardData } from "@/components/feature-section";
import { company } from "../company";

export const home = {
	metadata: {
		title: "DuoHub | Contabilidade Digital para MEI, ME e Startups",
		description:
			"Gestão contábil, fiscal e tributária com tecnologia e atendimento especializado. Plataforma 100% digital para MEI, ME e startups.",
	},
	hero: {
		kicker: "Plataforma 100% digital",
		kickerHref: "#servicos",
		title: "Contabilidade moderna \n para o seu negócio",
		description:
			"Gestão fiscal, tributária e financeira \n com tecnologia e atendimento especializado",
		primaryCta: {
			label: "Começar agora",
			href: "#contato",
		},
		secondaryCta: {
			label: "Fale conosco",
		},
	},
	socialProof: {
		clients: {
			title: "Quem confia na DuoHub",
			names: ["Mabela", "Naturalles", "Doce Menina"],
			separator: "·",
		},
		credentials: {
			items: [
				{
					icon: "briefcaseBusiness" as const,
					label: "Para Prestadores de Serviço",
				},
				{
					icon: "calendar" as const,
					label: "Desde 2024",
				},
				{
					icon: "trendingUp" as const,
					label: "Orientação Estratégica",
				},
			],
		},
		statement: {
			quote: "Cada empresa é única. Nosso atendimento também.",
		},
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
			illustration: "/illustrations/services.png",
			illustrationAlt: "Ilustração de documentos financeiros organizados",
		},
		{
			badge: "Por que nos escolher",
			title: "Atendimento próximo com quem entende do seu segmento",
			description:
				"Na DuoHub, você não é mais um número. Acreditamos que uma boa contabilidade começa com um atendimento próximo, onde cada cliente recebe atenção real e orientação pensada para o momento do seu negócio. Aqui, você fala direto com quem entende, sem respostas genéricas.",
			// accentClassName: "bg-muted border-muted",
			bullets: [
				{
					title: "Especialistas em prestadores de serviço",
					description:
						"Conhecemos a fundo a realidade do seu segmento e as obrigações que importam para você.",
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
				label: "Fale com um especialista",
				href: company.links.whatsappUrl(
					"Olá! Gostaria de falar com um especialista da DuoHub.",
				),
				external: true,
			},
			illustration: "/illustrations/results.png",
			illustrationAlt: "Ilustração de um gráfico de resultados financeiros",
		},
	] satisfies FeatureCardData[],
	about: {
		badge: "Sobre a DuoHub",
		title: "Duas formas de cuidar do seu negócio",
		description:
			"A DuoHub nasceu de uma convicção: contabilidade não precisa ser complicada. Criamos um modelo flexível que se adapta ao momento de cada empreendedor — seja quem precisa de um parceiro de longo prazo ou de uma solução rápida e certeira.",
		models: [
			{
				title: "Contabilidade Contínua",
				description:
					"Para quem quer um parceiro de verdade. Acompanhamos o dia a dia do seu negócio, antecipamos problemas e crescemos junto com você. É como ter um braço direito contábil sempre ao seu lado.",
				icon: "RefreshCw",
				accentColor: "primary" as const,
				bullets: [
					"Parceria de longo prazo",
					"Acompanhamento mensal dedicado",
					"Visão estratégica do negócio",
					"Suporte contínuo e proativo",
				],
			},
			{
				title: "Consultoria Sob Demanda",
				description:
					"Para quem sabe o que precisa e quer resolver rápido. Sem contrato de fidelidade, sem burocracia. Você nos aciona, a gente entrega — simples assim.",
				icon: "Zap",
				accentColor: "highlight" as const,
				bullets: [
					"Sem compromisso de longo prazo",
					"Escopo definido e objetivo",
					"Entrega ágil e direta",
					"Você no controle do investimento",
				],
			},
		],
		valuesTitle: "No que acreditamos",
		values: [
			{
				title: "Parceria real",
				description: "Seu sucesso é o nosso. Tratamos cada cliente como único",
				icon: "HeartHandshake",
			},
			{
				title: "Sem complicação",
				description: "Contabilidade traduzida para a linguagem do empreendedor",
				icon: "Lightbulb",
			},
			{
				title: "Evolução constante",
				description: "Sempre buscando formas melhores de entregar resultado",
				icon: "RefreshCw",
			},
			{
				title: "Olhar estratégico",
				description:
					"Mais do que cumprir obrigações: orientação para o seu negócio crescer",
				icon: "Compass",
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
			// {
			// 	id: "item-1",
			// 	question: "Como funciona a contabilidade digital da DuoHub?",
			// 	answer:
			// 		"Nossa plataforma permite que você acompanhe toda a gestão contábil da sua empresa em tempo real. Cuidamos da escrituração, obrigações fiscais e tributárias, enquanto você acessa relatórios e documentos de qualquer lugar. Combinamos tecnologia com atendimento humano para oferecer a melhor experiência.",
			// },
			{
				id: "item-1",
				question: "Quais documentos preciso para abrir minha empresa?",
				answer:
					"Para a abertura de empresa, geralmente precisamos de: RG e CPF dos sócios, comprovante de endereço, definição da atividade econômica (CNAE) e do tipo societário. Nossa equipe orienta você em cada etapa e cuida de toda a documentação junto aos órgãos competentes.",
			},
			// {
			// 	id: "item-3",
			// 	question: "Qual o prazo para regularizar minha situação fiscal?",
			// 	answer:
			// 		"O prazo varia conforme a complexidade da situação. Pendências simples podem ser resolvidas em poucos dias, enquanto casos mais complexos podem levar algumas semanas. Após uma análise inicial gratuita, informamos o prazo estimado e o plano de ação.",
			// },
			{
				id: "item-2",
				question: "Vocês atendem MEI?",
				answer:
					"Sim! Atendemos desde MEI até empresas de médio porte. Para o MEI, oferecemos um plano especial que inclui a declaração anual (DASN-SIMEI), controle de faturamento e orientação para desenquadramento quando necessário.",
			},
			{
				id: "item-3",
				question: "Como funciona o atendimento por WhatsApp?",
				answer:
					"Nosso atendimento por WhatsApp é rápido e direto. Você pode enviar documentos, tirar dúvidas e receber orientações em tempo real. Para questões mais complexas, agendamos uma reunião virtual. O WhatsApp é nosso canal principal de comunicação com os clientes.",
			},
			{
				id: "item-4",
				question: "Quanto custa o serviço de contabilidade?",
				answer:
					"Os valores variam de acordo com o porte da empresa, regime tributário e serviços contratados. Oferecemos planos a partir de R$ 199/mês para MEI e valores personalizados para empresas maiores. Entre em contato para receber uma proposta sob medida.",
			},
		],
		whatsappFallback: {
			text: "Olá! Não encontrei o que procurava nas perguntas frequentes. Podem me ajudar?",
			firstLine: "Não encontrou o que procura?",
			secondLinePrefix: "Fale com ",
			linkLabel: "nosso time",
		},
	},
	cta: {
		title: "Pronto para simplificar sua contabilidade?",
		description:
			"Entre em contato agora e descubra como podemos ajudar o seu negócio a crescer com tranquilidade.",
		whatsappText: "Olá! Gostaria de saber mais sobre os serviços da DuoHub.",
	},
	footer: {
		ariaLabelHome: `${company.brand.name} - Página inicial`,
		copyright: `© 2026 ${company.brand.name}. Todos os direitos reservados.`,
		developedBy: "Desenvolvido por Gustavo Vieira Martins",
	},
	header: {
		links: [
			{ label: "Serviços", href: "#servicos" },
			{ label: "Sobre", href: "#sobre" },
			{ label: "Contato", href: "#contato" },
		],
	},
} as const;

export type HomeTestimonial = (typeof home.testimonials.items)[number];
