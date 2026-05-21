import { z } from "zod";
import { ProposalTemplateKey, TaxRegime } from "@/generated/prisma/enums";

export const prospectDataSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("PF"),
		name: z.string().min(2),
		document: z.string().min(11),
		email: z.string().trim().email().toLowerCase().optional(),
		phone: z.string().optional(),
	}),
	z.object({
		type: z.literal("PJ"),
		legalName: z.string().min(2),
		document: z.string().min(14),
		taxRegime: z.enum(TaxRegime),
		segment: z.string().optional(),
		contactName: z.string().optional(),
		email: z.string().trim().email().toLowerCase().optional(),
		phone: z.string().optional(),
	}),
]);
export type ProspectData = z.infer<typeof prospectDataSchema>;

export const createProposalDraftSchema = z
	.object({
		templateKey: z.enum(ProposalTemplateKey),
		clientId: z.string().min(1).optional(),
		prospectData: prospectDataSchema.optional(),
	})
	.refine(
		(d) => (d.clientId && !d.prospectData) || (!d.clientId && d.prospectData),
		{ message: "Provide either clientId or prospectData" },
	);

export const saveProposalSectionSchema = z.object({
	proposalId: z.string().min(1),
	sectionKey: z.string().min(1),
	sectionData: z.record(z.string(), z.unknown()),
});

export const publishProposalCommercialSchema = z
	.object({
		category: z.enum(["CONTINUOUS", "ONE_OFF"]),
		mainAmount: z.number().positive().optional(),
		recurringAmount: z.number().positive().optional(),
		currency: z.string().min(3),
		expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	})
	.refine(
		(d) => (d.category === "ONE_OFF" ? d.mainAmount !== undefined : true),
		{ message: "mainAmount required for ONE_OFF", path: ["mainAmount"] },
	)
	.refine(
		(d) =>
			d.category === "CONTINUOUS" ? d.recurringAmount !== undefined : true,
		{
			message: "recurringAmount required for CONTINUOUS",
			path: ["recurringAmount"],
		},
	);

export const cancelProposalSchema = z.object({
	proposalId: z.string().min(1),
	reason: z.string().max(500).optional(),
});

export const proposalIdSchema = z.object({
	proposalId: z.string().min(1),
});
