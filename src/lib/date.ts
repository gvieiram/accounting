import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function formatDate(date: Date | null | undefined): string {
	if (!date) return "";
	return format(date, "dd/MM/yyyy", { locale: ptBR });
}

export function formatDateTime(date: Date | null | undefined): string {
	if (!date) return "";
	return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
}

export function formatRelative(date: Date | null | undefined): string {
	if (!date) return "";
	return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
}
