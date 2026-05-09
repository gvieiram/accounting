export const common = {
	actions: {
		start: "Começar",
		startNow: "Começar agora",
		login: "Entrar",
		talkToUs: "Fale conosco",
		talkToSpecialist: "Fale com um especialista",
		scheduleConsultation: "Agendar consulta",
		send: "Enviar",
		talkOnWhatsapp: "Falar no WhatsApp",
		seeMore: "Ver mais",
		seeLess: "Ver menos",
	},
	nav: {
		home: { label: "Início", href: "/" },
		services: { label: "Serviços", href: "/#servicos" },
		about: { label: "Sobre", href: "/#sobre" },
		contact: { label: "Contato", href: "/#contato" },
		ir: { label: "Imposto de Renda", href: "/imposto-de-renda", badge: "2026" },
	},
	forms: {
		labels: {
			name: "Nome",
			email: "E-mail",
			phone: "Telefone",
			message: "Mensagem (opcional)",
		},
		errors: {
			required: "Campo obrigatório",
			invalidEmail: "E-mail inválido",
		},
		submit: {
			sending: "Enviando...",
		},
	},
	banner: {
		defaultWhatsappText: "Olá! Gostaria de mais informações.",
	},
	status: {
		active: "Ativo",
		revoked: "Revogado",
	},
	terms: {
		createdAt: "Cadastrado em",
		lastAccess: "Último acesso",
		actions: "Ações",
		optional: "(opcional)",
		never: "Nunca acessou",
	},
	a11y: {
		toggleMenu: "Alternar menu",
		closeBanner: "Fechar banner",
		themeLight: "Ativar modo claro",
		themeDark: "Ativar modo escuro",
		footerNav: "Links do rodapé",
		testimonialsScroll: "Depoimentos em rolagem",
		photoOf: (name: string) => `Foto de ${name}`,
		scrollToForm: "Ir para o formulário de contato",
		toggleAccordion: "Expandir ou recolher conteúdo",
	},
} as const;
