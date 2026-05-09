export const admin = {
	nav: {
		sectionLabel: "Geral",
		dashboard: "Dashboard",
		clients: "Clientes",
		users: "Usuários",
		settings: "Configurações",
	},
	shell: {
		logout: "Sair",
		toggleSidebar: "Alternar menu lateral",
		loading: "Carregando",
	},
	dashboard: {
		title: "Dashboard",
		welcome: (firstName: string) => `Olá, ${firstName}`,
		placeholder: "Em breve: indicadores e atividade recente.",
	},
	breadcrumb: {
		root: "Dashboard",
		segments: {
			clients: "Clientes",
			users: "Usuários",
			settings: "Configurações",
			new: "Novo",
			edit: "Editar",
		},
	},
	errors: {
		pageBoundary: "Algo deu errado",
		pageBoundaryDescription:
			"Tente novamente. Se persistir, contate o suporte.",
		retry: "Tentar de novo",
		logoutFailed: "Não foi possível encerrar sua sessão. Tente novamente.",
	},
	users: {
		title: "Usuários",
		subtitle: "Administradores com acesso ao painel.",
		invite: "Convidar usuário",
		columns: {
			user: "Usuário",
			status: "Status",
			lastAccess: "Último acesso",
			createdAt: "Cadastrado em",
			actions: "Ações",
		},
		empty: {
			title: "Nenhum usuário cadastrado",
			description: "Convide o primeiro administrador.",
		},
		emptyForFilter: {
			noMatch: "Nenhum usuário corresponde ao filtro selecionado.",
		},
		filter: {
			label: "Filtrar por status",
			active: "Ativos",
			invited: "Convites",
			revoked: "Revogados",
		},
		statusBadge: {
			active: "Ativo",
			invited: "Convidado",
			expired: "Convite expirado",
			revoked: "Revogado",
		},
		rowMenu: {
			label: "Ações",
			revoke: "Revogar acesso",
			reactivate: "Reativar acesso",
			resendInvite: "Reenviar convite",
			cancelInvite: "Cancelar convite",
		},
		inviteDialog: {
			title: "Convidar administrador",
			description:
				"Enviaremos um convite por e-mail. A pessoa precisa aceitar em até 24 horas para ter acesso.",
			emailLabel: "E-mail",
			nameLabel: "Nome",
			submit: "Convidar",
			success: "Convite enviado.",
		},
		revokeDialog: {
			title: "Revogar acesso?",
			description: (email: string) =>
				`Isso impede que ${email} acesse o painel. Sessões ativas serão encerradas.`,
			confirm: "Revogar acesso",
			cancel: "Cancelar",
			success: "Acesso revogado.",
		},
		reactivateDialog: {
			title: "Reativar acesso?",
			description: (email: string) =>
				`${email} poderá entrar novamente pelo /login.`,
			confirm: "Reativar acesso",
			cancel: "Cancelar",
			success: "Acesso reativado.",
		},
		cancelInviteDialog: {
			title: "Cancelar convite?",
			description: (email: string) =>
				`O link enviado para ${email} deixará de funcionar.`,
			confirm: "Cancelar convite",
			cancel: "Voltar",
			success: "Convite cancelado.",
		},
		resendInvite: {
			success: "Convite reenviado.",
		},
		errors: {
			duplicateEmail: "Já existe um administrador com este e-mail.",
			generic: "Não foi possível concluir. Tente novamente.",
			selfRevoke: "Você não pode revogar seu próprio acesso.",
		},
	},
} as const;
