import { type core, z } from "zod";

// Global pt-BR error map for Zod 4. Importing this module anywhere triggers
// the side-effect; the schemas in `src/features/**/schemas.ts` import it at
// the top so any consumer (forms, server actions) gets translated messages.

type Issue = core.$ZodRawIssue;

function translateTooSmall(
	issue: Extract<Issue, { code: "too_small" }>,
): string {
	const min = Number(issue.minimum ?? 0);
	if (issue.origin === "string") {
		return min <= 1 ? "Campo obrigatório." : `Mínimo de ${min} caracteres.`;
	}
	if (issue.origin === "array") return `Mínimo de ${min} item(ns).`;
	if (issue.origin === "number") return `Valor mínimo: ${min}.`;
	return `Valor abaixo do mínimo (${min}).`;
}

function translateTooBig(issue: Extract<Issue, { code: "too_big" }>): string {
	const max = Number(issue.maximum ?? 0);
	if (issue.origin === "string") return `Máximo de ${max} caracteres.`;
	if (issue.origin === "array") return `Máximo de ${max} item(ns).`;
	if (issue.origin === "number") return `Valor máximo: ${max}.`;
	return `Valor acima do máximo (${max}).`;
}

function translateFormat(format: string | undefined): string {
	switch (format) {
		case "email":
			return "E-mail inválido.";
		case "url":
			return "URL inválida.";
		case "uuid":
			return "Identificador inválido.";
		case "regex":
			return "Formato inválido.";
		case "date":
			return "Data inválida.";
		case "datetime":
			return "Data/hora inválida.";
		default:
			return "Formato inválido.";
	}
}

function translateIssue(issue: Issue): string | undefined {
	switch (issue.code) {
		case "invalid_type":
			return issue.input === undefined || issue.input === null
				? "Campo obrigatório."
				: "Tipo inválido.";
		case "too_small":
			return translateTooSmall(issue);
		case "too_big":
			return translateTooBig(issue);
		case "invalid_format":
			return translateFormat((issue as { format?: string }).format);
		case "invalid_value":
			return "Valor não permitido.";
		case "not_multiple_of":
			return "Valor não é múltiplo permitido.";
		case "invalid_union":
			return "Valor inválido.";
		case "unrecognized_keys":
			return "Campos não reconhecidos.";
		case "invalid_key":
			return "Chave inválida.";
		case "invalid_element":
			return "Elemento inválido.";
		default:
			return undefined;
	}
}

z.config({ customError: translateIssue });
