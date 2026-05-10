import type {
	ClientStatus,
	ClientType,
	TaxRegime,
} from "@/generated/prisma/enums";

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
	clients: {
		title: "Clientes",
		subtitle: "Cadastro de clientes PF e PJ.",
		new: "Novo cliente",
		edit: "Editar cliente",
		columns: {
			client: "Cliente",
			document: "Documento",
			type: "Tipo",
			regime: "Regime",
			status: "Status",
			createdAt: "Cadastrado em",
		},
		empty: {
			title: "Nenhum cliente cadastrado",
			description: "Cadastre o primeiro cliente.",
		},
		emptyForFilter: {
			noMatch: "Nenhum cliente corresponde aos filtros.",
		},
		filter: {
			search: "Buscar por nome, fantasia, e-mail ou documento",
			type: "Tipo",
			status: "Status",
			archived: "Mostrar arquivados",
			allTypes: "Todos",
			allStatuses: "Todos",
		},
		form: {
			sections: {
				identification: "Identificação",
				taxation: "Tributação",
				primaryContact: "Contato principal",
				address: "Endereço",
				additionalContacts: "Contatos adicionais",
				hierarchy: "Hierarquia",
				notes: "Notas internas",
			},
			fields: {
				type: "Tipo de pessoa",
				name: "Nome completo",
				tradeName: "Nome fantasia",
				document: "Documento (CPF / CNPJ)",
				taxRegime: "Regime tributário",
				email: "E-mail",
				phone: "Telefone",
				cep: "CEP",
				street: "Logradouro",
				number: "Número",
				complement: "Complemento",
				neighborhood: "Bairro",
				city: "Cidade",
				state: "UF",
				parentClientId: "Matriz",
				notes: "Notas internas",
			},
			hints: {
				cepLookup: "Buscando endereço…",
				cnpjRootMustMatch:
					"A filial precisa compartilhar a raiz do CNPJ (8 dígitos) com a matriz.",
			},
			submit: {
				create: "Cadastrar cliente",
				update: "Salvar alterações",
				saving: "Salvando…",
			},
		},
		archiveDialog: {
			title: "Arquivar cliente?",
			description: (n: number) =>
				n > 0
					? `Esta matriz tem ${n} filial(is) ativa(s); todas serão arquivadas junto.`
					: "O cliente poderá ser restaurado depois pela equipe.",
			confirm: "Arquivar",
			cancel: "Voltar",
			success: "Cliente arquivado.",
		},
		errors: {
			duplicateDocument: "Já existe um cliente com este documento.",
			invalidCpf: "CPF inválido.",
			invalidCnpj: "CNPJ inválido.",
			parentNotMatriz: "O cliente selecionado já é uma filial.",
			parentArchived: "A matriz selecionada está arquivada.",
			parentTypeMismatch: "Filial só pode pertencer a uma matriz PJ.",
			cnpjRootMismatch:
				"O CNPJ da filial precisa compartilhar a raiz com a matriz.",
			generic: "Não foi possível concluir. Tente novamente.",
		},
	},
	enums: {
		clientType: {
			// biome-ignore lint/style/useNamingConvention: keys must match Prisma enum values
			PF: "Pessoa Física",
			// biome-ignore lint/style/useNamingConvention: keys must match Prisma enum values
			PJ: "Pessoa Jurídica",
		} satisfies Record<ClientType, string>,
		taxRegime: {
			// biome-ignore lint/style/useNamingConvention: keys must match Prisma enum values
			MEI: "MEI",
			// biome-ignore lint/style/useNamingConvention: keys must match Prisma enum values
			SIMPLES_NACIONAL: "Simples Nacional",
			// biome-ignore lint/style/useNamingConvention: keys must match Prisma enum values
			LUCRO_PRESUMIDO: "Lucro Presumido",
			// biome-ignore lint/style/useNamingConvention: keys must match Prisma enum values
			LUCRO_REAL: "Lucro Real",
		} satisfies Record<TaxRegime, string>,
		clientStatus: {
			// biome-ignore lint/style/useNamingConvention: keys must match Prisma enum values
			ACTIVE: "Ativo",
			// biome-ignore lint/style/useNamingConvention: keys must match Prisma enum values
			PROSPECT: "Prospect",
			// biome-ignore lint/style/useNamingConvention: keys must match Prisma enum values
			INACTIVE: "Inativo",
			// biome-ignore lint/style/useNamingConvention: keys must match Prisma enum values
			CHURNED: "Churn",
		} satisfies Record<ClientStatus, string>,
	},
};
