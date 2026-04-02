import { z } from "zod";

const bannerCtaSchema = z.object({
	label: z.string().optional(),
	whatsappText: z.string().optional(),
});

export const bannerConfigSchema = z.object({
	active: z.boolean(),
	startDate: z.string().optional(),
	endDate: z.string().optional(),
	title: z.string(),
	description: z.string().optional(),
	storageKey: z.string(),
	icon: z.string().optional(),
	position: z.enum(["top", "bottom"]).optional().default("bottom"),
	cta: bannerCtaSchema.optional(),
});

export type BannerConfig = z.infer<typeof bannerConfigSchema>;
