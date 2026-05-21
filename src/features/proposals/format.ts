import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const BRL_FORMATTER = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL",
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

export function formatBRL(value: number | null | undefined): string {
	if (value === null || value === undefined) return "";
	return BRL_FORMATTER.format(value);
}

export function formatDateBR(
	value: Date | string | null | undefined,
): string {
	if (value === null || value === undefined) return "";
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	return format(date, "dd/MM/yyyy", { locale: ptBR });
}
