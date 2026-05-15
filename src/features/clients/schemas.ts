import "@/lib/zod-config";

import { z } from "zod";
import {
	CLIENT_STATUSES,
	CLIENT_TYPES,
	MAX_ADDITIONAL_CONTACTS,
	MAX_NOTES_LENGTH,
	TAX_REGIMES,
} from "./constants";
import { cnpjRoot, isValidCnpj, isValidCpf, stripDocument } from "./utils";

// ---------------------------------------------------------------------------
// additionalContactSchema
// ---------------------------------------------------------------------------

export const additionalContactSchema = z.object({
	name: z.string().trim().min(1).max(120),
	// min(1) ensures "" fails the left branch so .or(z.literal("")) can coerce it
	// to undefined. Without min(1), Zod 4's .optional() passes "" through unchanged.
	role: z
		.string()
		.trim()
		.min(1)
		.max(80)
		.optional()
		.or(z.literal("").transform(() => undefined)),
	email: z.string().trim().email().toLowerCase(),
	phone: z
		.string()
		.trim()
		.regex(/^\d{10,11}$/),
});

export type AdditionalContactInput = z.infer<typeof additionalContactSchema>;

// ---------------------------------------------------------------------------
// clientSchema — single schema for both create and edit
// ---------------------------------------------------------------------------

export const clientSchema = z
	.object({
		type: z.enum([...CLIENT_TYPES] as const),
		legalName: z.string().trim().min(2).max(200),
		// min(1) required so "" fails the left branch and falls to .or(z.literal(""))
		tradeName: z
			.string()
			.trim()
			.min(1)
			.max(200)
			.optional()
			.or(z.literal("").transform(() => undefined)),
		document: z.string().transform(stripDocument),
		taxRegime: z
			.enum([...TAX_REGIMES] as const)
			.nullable()
			.optional(),
		stateRegistration: z
			.string()
			.trim()
			.min(1)
			.max(40)
			.optional()
			.or(z.literal("").transform(() => undefined)),
		cityRegistration: z
			.string()
			.trim()
			.min(1)
			.max(40)
			.optional()
			.or(z.literal("").transform(() => undefined)),
		segment: z
			.string()
			.trim()
			.min(1)
			.max(80)
			.optional()
			.or(z.literal("").transform(() => undefined)),
		primaryEmail: z.string().trim().email().toLowerCase(),
		primaryPhone: z
			.string()
			.trim()
			.regex(/^\d{10,11}$/),
		contactName: z.string().trim().min(2).max(120),
		// Strips non-digits from the input; accepts an 8-digit string or empty string.
		// Empty string is intentional: the form ships "" for blank CEP inputs.
		// Relies on the form/action to provide either a stripped 8-digit value or "".
		zipCode: z
			.string()
			.regex(/^\d{8}$/)
			.optional()
			.or(z.literal("").transform(() => undefined)),
		street: z.string().trim().max(200).optional(),
		number: z.string().trim().max(20).optional(),
		complement: z.string().trim().max(120).optional(),
		neighborhood: z.string().trim().max(120).optional(),
		city: z.string().trim().max(120).optional(),
		state: z.string().trim().length(2).optional(),
		additionalContacts: z
			.array(additionalContactSchema)
			.max(MAX_ADDITIONAL_CONTACTS)
			.default([]),
		parentClientId: z.string().min(1).nullable().optional(),
		// Hidden field populated by the combobox onSelect; only used in superRefine
		// for cross-CNPJ root validation. Not persisted to the DB directly.
		parentDocument: z.string().optional(),
		status: z.enum([...CLIENT_STATUSES] as const),
		internalNotes: z
			.string()
			.min(1)
			.max(MAX_NOTES_LENGTH)
			.optional()
			.or(z.literal("").transform(() => undefined)),
	})
	.superRefine((data, ctx) => {
		if (data.type === "PF") {
			if (data.document.length !== 11 || !isValidCpf(data.document)) {
				ctx.addIssue({
					code: "custom",
					path: ["document"],
					message: "CPF inválido.",
				});
			}
			if (data.parentClientId) {
				ctx.addIssue({
					code: "custom",
					path: ["parentClientId"],
					message: "Apenas PJ pode ter matriz.",
				});
			}
		} else {
			if (data.document.length !== 14 || !isValidCnpj(data.document)) {
				ctx.addIssue({
					code: "custom",
					path: ["document"],
					message: "CNPJ inválido.",
				});
			}
			if (
				data.parentClientId &&
				data.parentDocument &&
				cnpjRoot(data.document) !== cnpjRoot(data.parentDocument)
			) {
				ctx.addIssue({
					code: "custom",
					path: ["document"],
					message: "A filial precisa compartilhar a raiz do CNPJ com a matriz.",
				});
			}
		}
	});

export type ClientFormInput = z.input<typeof clientSchema>;
export type ClientFormData = z.output<typeof clientSchema>;

// ---------------------------------------------------------------------------
// archiveClientSchema
// ---------------------------------------------------------------------------

export const archiveClientSchema = z.object({
	clientId: z.string().min(1),
});

export type ArchiveClientInput = z.infer<typeof archiveClientSchema>;

// ---------------------------------------------------------------------------
// searchMatrizCandidatesSchema
// ---------------------------------------------------------------------------

export const searchMatrizCandidatesSchema = z.object({
	search: z.string().max(200).default(""),
	excludeId: z.string().min(1).optional(),
});

export type SearchMatrizCandidatesInput = z.infer<
	typeof searchMatrizCandidatesSchema
>;
