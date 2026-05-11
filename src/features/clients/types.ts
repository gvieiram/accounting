import type { ClientStatus, ClientType } from "@/generated/prisma/enums";

// Re-export inferred types from schemas for convenience
export type {
	AdditionalContactInput,
	ArchiveClientInput,
	ClientFormInput,
} from "./schemas";

// ---------------------------------------------------------------------------
// List / filter types
// ---------------------------------------------------------------------------

export type ClientListFilters = {
	q?: string;
	type?: ClientType;
	status?: ClientStatus;
	archived?: boolean;
};

// ClientListItem will be defined and exported from queries.ts (Task 7)
// once the Prisma query shape is known.

// ---------------------------------------------------------------------------
// Combobox / relational helpers
// ---------------------------------------------------------------------------

export type ParentClientCandidate = {
	id: string;
	legalName: string;
	tradeName: string | null;
	document: string;
};
