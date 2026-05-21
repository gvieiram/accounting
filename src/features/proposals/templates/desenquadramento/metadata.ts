import type { FieldMetadata } from "../../types";

export const metadata: FieldMetadata = {
	"content.summary.text": {
		kind: "multiline",
		label: "Resumo da proposta",
		section: "summary",
		required: true,
	},
	"content.budget.modality": {
		kind: "text",
		label: "Modalidade",
		section: "budget",
		required: true,
	},
	"content.budget.monthlyRevenue": {
		kind: "text",
		label: "Faturamento mensal estimado",
		section: "budget",
		required: true,
	},
	"content.budget.invoiceLimitDescription": {
		kind: "text",
		label: "Descrição do limite de notas fiscais",
		section: "budget",
		required: true,
	},
	"content.extra.title": {
		kind: "text",
		label: "Título do serviço pontual",
		section: "extra",
		required: true,
	},
	"content.extra.description": {
		kind: "multiline",
		label: "Descrição do serviço pontual",
		section: "extra",
		required: true,
	},
	"content.terms.validityText": {
		kind: "text",
		label: "Texto de validade",
		section: "terms",
		required: true,
	},
	"content.terms.billingDay": {
		kind: "text",
		label: "Dia de cobrança",
		section: "terms",
		required: true,
	},
	"content.terms.noticePeriod": {
		kind: "text",
		label: "Aviso prévio de rescisão",
		section: "terms",
		required: true,
	},
};
