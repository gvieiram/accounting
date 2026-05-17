import { ClientStatus, ClientType, TaxRegime } from "@/generated/prisma/enums";

export const CLIENT_TYPES = [ClientType.PF, ClientType.PJ] as const;
export const TAX_REGIMES = [
	TaxRegime.MEI,
	TaxRegime.SIMPLES_NACIONAL,
	TaxRegime.LUCRO_PRESUMIDO,
	TaxRegime.LUCRO_REAL,
] as const;
export const CLIENT_STATUSES = [
	ClientStatus.ACTIVE,
	ClientStatus.PROSPECT,
	ClientStatus.INACTIVE,
	ClientStatus.CHURNED,
] as const;

export const MAX_ADDITIONAL_CONTACTS = 10;
export const MAX_NOTES_LENGTH = 5000;
export const AUDIT_DIFF_FIELD_TRUNCATE = 500;
export const CLIENTS_PAGE_SIZE = 100;
