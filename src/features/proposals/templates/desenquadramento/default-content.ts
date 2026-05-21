import type { EditableContent } from "./schema";

export const defaultContent: EditableContent = {
	summary: {
		text: "Esta proposta contempla o desenquadramento do MEI. O investimento inicial para regularizar a sua empresa é de R$ 1.200,00 (valor único). Após essa etapa, você contratará o serviço de contabilidade por R$ 400,00 mensais, que inclui toda obrigação contábil e fiscal necessária, garantindo total eficiência ao negócio.",
	},
	budget: {
		modality: "Prestador de Serviço",
		monthlyRevenue: "R$ 30.000,00",
		invoiceLimitDescription: "Emissão de até 5 notas fiscais",
	},
	extra: {
		title: "Desenquadramento: MEI para ME",
		description:
			"Processo necessário para regularização como Microempresa. O desenquadramento é pré-requisito para o início dos serviços de contabilidade mensal. Este serviço é realizado uma única vez e garante sua regularização junto aos órgãos competentes.",
	},
	terms: {
		validityText: "15 dias",
		billingDay: "15",
		noticePeriod: "30 dias",
	},
};
