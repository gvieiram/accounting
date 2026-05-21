import { z } from "zod";

export const editableContentSchema = z.object({
	summary: z.object({
		text: z.string().min(20),
	}),
	budget: z.object({
		modality: z.string().min(1),
		monthlyRevenue: z.string().min(1),
		invoiceLimitDescription: z.string().min(1),
	}),
	extra: z.object({
		title: z.string().min(1),
		description: z.string().min(1),
	}),
	terms: z.object({
		validityText: z.string().min(1),
		billingDay: z.string().min(1),
		noticePeriod: z.string().min(1),
	}),
});

export type EditableContent = z.infer<typeof editableContentSchema>;

/** Paths in `content.*` that the template references. Keep in sync with template.html. */
export const SCHEMA_PATHS = [
	"content.summary.text",
	"content.budget.modality",
	"content.budget.monthlyRevenue",
	"content.budget.invoiceLimitDescription",
	"content.extra.title",
	"content.extra.description",
	"content.terms.validityText",
	"content.terms.billingDay",
	"content.terms.noticePeriod",
] as const;
