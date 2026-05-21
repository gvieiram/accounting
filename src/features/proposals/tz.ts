import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

const TZ = "America/Sao_Paulo";

export function toEndOfSaoPauloDay(date: string | Date): Date {
	if (typeof date === "string") {
		return fromZonedTime(`${date}T23:59:59.999`, TZ);
	}

	const zoned = toZonedTime(date, TZ);

	const eodZoned = new Date(
		zoned.getFullYear(),
		zoned.getMonth(),
		zoned.getDate(),
		23,
		59,
		59,
		999,
	);

	return fromZonedTime(eodZoned, TZ);
}

export function isExpired(
	expiresAt: Date | null,
	now: Date = new Date(),
): boolean {
	if (!expiresAt) return false;
	return expiresAt <= now;
}

export function formatExpirationBR(expiresAt: Date | null): string {
	if (!expiresAt) return "";
	const zoned = toZonedTime(expiresAt, TZ);
	return format(zoned, "dd/MM/yyyy", { locale: ptBR });
}
