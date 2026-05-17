export const auth = {
	login: {
		metadata: {
			title: "Entrar — DuoHub",
		},
		title: "Entrar no DuoHub",
		subtitle: "Receba um link de acesso por email.",
		emailLabel: "E-mail",
		emailPlaceholder: "voce@duohubcontabil.com.br",
		submit: "Receber link de acesso",
		submitting: "Enviando...",
		successTitle: "Verifique seu email",
		successMessage:
			"Se este email estiver cadastrado, você receberá um link de acesso em alguns minutos. O link expira em 15 minutos.",
		errors: {
			forbidden:
				"Este email não tem permissão para acessar a área administrativa.",
			sessionInvalidated: "Sua sessão foi encerrada. Entre novamente.",
			expiredToken: "Este link expirou. Solicite um novo para entrar.",
			invalidToken: "Link inválido. Solicite um novo para entrar.",
			attemptsExceeded:
				"Este link não pode mais ser usado. Solicite um novo para entrar.",
			generic:
				"Não foi possível validar seu link de acesso. Solicite um novo para entrar.",
		},
		chooser: {
			title: "Bem-vindo de volta",
			subtitle: "Escolha como deseja entrar",
			magicLinkButton: "Entrar com link de acesso",
			appleButton: "Entrar com Apple",
			googleButton: "Entrar com Google",
			comingSoon: "Em breve",
		},
		magicLink: {
			title: "Link de acesso",
			subtitle: "Receba um link de acesso por email",
			switchMethod: "Escolha outro método de login",
		},
		terms: {
			agreement: "Ao continuar, você concorda com nossos",
			termsOfService: "Termos de Serviço",
			privacyPolicy: "Política de Privacidade",
			and: "e",
		},
	},
	email: {
		subject: "Seu link de acesso ao DuoHub",
		heading: "Acesso ao DuoHub",
		cta: "Entrar no DuoHub",
		expiry: "O link expira em 15 minutos.",
		notRequested: "Se você não solicitou este link, ignore este email.",
	},
} as const;
