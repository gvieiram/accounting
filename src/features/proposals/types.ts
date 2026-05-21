import type { z } from "zod";

export type FieldKind = "text" | "multiline" | "currency" | "date" | "list";

export type FieldMetadata = Record<
	string,
	{
		kind: FieldKind;
		label: string;
		section: string;
		required?: boolean;
		itemLabel?: string;
	}
>;

export type Template<TSchema extends z.ZodTypeAny = z.ZodTypeAny> = {
	key:
		| "DESENQUADRAMENTO"
		| "REESTRUTURACAO"
		| "ABERTURA"
		| "TRANSFERENCIA"
		| "ENTREGA_ANUAL_MEI"
		| "ANALISE_CONTABIL";
	name: string;
	category: "CONTINUOUS" | "ONE_OFF";
	html: string;
	schema: TSchema;
	metadata: FieldMetadata;
	defaultContent: z.infer<TSchema>;
};

/** Data shape passed to renderTemplate. Templates reference these namespaces in placeholders. */
export type RenderData = {
	client: {
		name: string;
		document: string;
		contact?: string;
		email?: string;
		phone?: string;
	};
	commercial: {
		mainAmount?: number;
		recurringAmount?: number;
		currency: string;
		paymentTerms?: string;
		[key: string]: unknown;
	};
	content: Record<string, unknown>;
	proposal: {
		expiresAt?: Date;
	};
};
