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
			href: "#services",
		},
		about: {
			label: "Sobre",
			href: "#about",
		},
		contact: {
			label: "Contato",
			href: "#contact",
		},
		// plans: "Planos",
	},
	forms: {
		placeholders: {
			name: "Nome",
			email: "E-mail",
			phone: "Telefone",
			message: "Mensagem (opcional)",
		},
	},
	a11y: {
		toggleMenu: "Toggle menu",
		footerNav: "Links do rodapé",
		testimonialsScroll: "Depoimentos em rolagem",
		photoOf: (name: string) => `Foto de ${name}`,
	},
} as const;
