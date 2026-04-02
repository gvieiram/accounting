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
	},
	nav: {
		home: {
			label: "Início",
			href: "/",
		},
		services: {
			label: "Serviços",
			href: "#servicos",
		},
		about: {
			label: "Sobre",
			href: "#sobre",
		},
		contact: {
			label: "Contato",
			href: "#contato",
		},
	},
	forms: {
		labels: {
			name: "Nome",
			email: "E-mail",
			phone: "Telefone",
			message: "Mensagem (opcional)",
		},
	},
	banner: {
		defaultWhatsappText: "Olá! Gostaria de mais informações.",
	},
	a11y: {
		toggleMenu: "Alternar menu",
		closeBanner: "Fechar banner",
		themeLight: "Ativar modo claro",
		themeDark: "Ativar modo escuro",
		footerNav: "Links do rodapé",
		testimonialsScroll: "Depoimentos em rolagem",
		photoOf: (name: string) => `Foto de ${name}`,
	},
} as const;
