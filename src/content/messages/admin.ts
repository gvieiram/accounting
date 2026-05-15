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
		viewDetails: "Abrir detalhes do cliente",
		branchesCount: (n: number) => (n === 1 ? "1 filial" : `${n} filiais`),
		matrizWithBranches: (n: number) =>
			n === 1 ? "Matriz · 1 filial" : `Matriz · ${n} filiais`,
		kpis: {
			active: "Ativos",
			prospect: "Em prospecção",
			inactive: "Inativos",
			archived: "Arquivados",
			filterAria: (label: string) => `Filtrar por ${label}`,
		},
		columns: {
			client: "Cliente",
			document: "Documento",
			type: "Tipo",
			regime: "Regime",
			status: "Status",
			createdAt: "Cadastrado em",
			actions: "Ações",
		},
		empty: {
			title: "Nenhum cliente cadastrado",
			description: "Cadastre o primeiro cliente.",
		},
		emptyForFilter: {
			noMatch: "Nenhum cliente corresponde aos filtros.",
			clear: "Limpar filtros",
		},
		filter: {
			search: "Buscar por nome, fantasia, e-mail ou documento",
			type: "Tipo",
			status: "Status",
			archived: "Mostrar arquivados",
			allTypes: "Todos",
			allStatuses: "Todos",
		},
		detail: {
			notFound: "Cliente não encontrado",
			sections: {
				identification: "Identificação",
				contact: "Contato principal",
				address: "Endereço",
				branches: "Filiais",
				additionalContacts: "Contatos adicionais",
				notes: "Notas internas",
			},
			labels: {
				type: "Tipo",
				legalName: "Razão social / Nome",
				tradeName: "Nome fantasia",
				document: "Documento",
				taxRegime: "Regime tributário",
				stateRegistration: "Inscrição estadual",
				cityRegistration: "Inscrição municipal",
				segment: "Segmento",
				contactName: "Responsável",
				email: "E-mail",
				phone: "Telefone",
				parent: "Matriz",
				createdAt: "Cadastrado em",
			},
			empty: {
				address: "Endereço não cadastrado.",
				branches: "Nenhuma filial vinculada.",
				additionalContacts: "Nenhum contato adicional.",
				notes: "Sem notas internas.",
			},
		},
		form: {
			sheet: {
				titleCreate: "Novo cliente",
				titleEdit: "Editar cliente",
				descriptionCreate: "Preencha os dados do novo cliente.",
				descriptionEdit: (name: string) => `Editando ${name}.`,
				close: "Fechar",
			},
			tabs: {
				identification: "Identificação",
				contact: "Contato",
				address: "Endereço",
				hierarchy: "Hierarquia",
				extras: "Mais",
			},
			errorSummary: (count: number, firstTab: string) =>
				count === 1
					? `1 campo precisa de atenção em ${firstTab}.`
					: `${count} campos precisam de atenção. Comece por ${firstTab}.`,
			dismissDialog: {
				title: "Descartar alterações?",
				description:
					"Você tem alterações não salvas. Se sair agora, elas serão perdidas.",
				confirm: "Descartar",
				cancel: "Continuar editando",
			},
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
				legalName: "Razão social / Nome completo",
				tradeName: "Nome fantasia",
				document: "Documento (CPF / CNPJ)",
				documentCpf: "CPF",
				documentCnpj: "CNPJ",
				taxRegime: "Regime tributário",
				stateRegistration: "Inscrição estadual",
				cityRegistration: "Inscrição municipal",
				segment: "Segmento",
				contactName: "Nome do contato",
				primaryEmail: "E-mail principal",
				primaryPhone: "Telefone principal",
				cep: "CEP",
				street: "Logradouro",
				number: "Número",
				complement: "Complemento",
				neighborhood: "Bairro",
				city: "Cidade",
				state: "UF",
				parentClientId: "Matriz",
				status: "Status",
				notes: "Notas internas",
				additionalContactName: "Nome",
				additionalContactRole: "Função",
				additionalContactEmail: "E-mail",
				additionalContactPhone: "Telefone",
			},
			hints: {
				cepLookup: "Buscando endereço…",
				cnpjRootMustMatch:
					"A filial precisa compartilhar a raiz do CNPJ (8 dígitos) com a matriz.",
				noParent: "Nenhuma (esta é matriz ou independente)",
				noParentResults: "Nenhuma matriz encontrada.",
			},
			submit: {
				create: "Cadastrar cliente",
				update: "Salvar alterações",
				saving: "Salvando…",
				successCreate: "Cliente cadastrado.",
				successUpdate: "Alterações salvas.",
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
		unarchiveDialog: {
			title: "Desarquivar cliente?",
			description: (n: number) =>
				n > 0
					? `Esta matriz tem ${n} filial(is) arquivada(s); todas serão restauradas junto.`
					: "O cliente voltará para a lista ativa.",
			confirm: "Desarquivar",
			cancel: "Voltar",
			success: "Cliente desarquivado.",
		},
		errors: {
			invalidData: "Dados inválidos.",
			notFound: "Cliente não encontrado.",
			duplicateDocument: "Já existe um cliente com este documento.",
			invalidCpf: "CPF inválido.",
			invalidCnpj: "CNPJ inválido.",
			parentNotFound: "Matriz não encontrada.",
			parentNotMatriz: "O cliente selecionado já é uma filial.",
			parentArchived: "A matriz selecionada está arquivada.",
			parentStillArchived:
				"A matriz deste cliente ainda está arquivada. Desarquive a matriz primeiro.",
			parentTypeMismatch: "Filial só pode pertencer a uma matriz PJ.",
			cnpjRootMismatch:
				"O CNPJ da filial precisa compartilhar a raiz com a matriz.",
			pjWithBranches:
				"Não é possível alterar uma matriz para PF enquanto houver filiais ativas.",
			matrizToFilialWithBranches:
				"Não é possível tornar uma matriz em filial enquanto houver filiais ativas vinculadas.",
			matrizRootChangeWithBranches:
				"Não é possível alterar a raiz do CNPJ de uma matriz com filiais ativas vinculadas.",
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
			PROSPECT: "Em prospecção",
			// biome-ignore lint/style/useNamingConvention: keys must match Prisma enum values
			INACTIVE: "Inativo",
			// biome-ignore lint/style/useNamingConvention: keys must match Prisma enum values
			CHURNED: "Cancelado",
		} satisfies Record<ClientStatus, string>,
	},
};
