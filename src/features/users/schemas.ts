import { z } from "zod";

export const inviteUserSchema = z.object({
	email: z.string().trim().email("E-mail inválido").toLowerCase(),
	name: z
		.string()
		.trim()
		.min(2)
		.max(120)
		.optional()
		.or(z.literal("").transform(() => undefined)),
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;

export const revokeUserSchema = z.object({
	userId: z.string().min(1),
});

export type RevokeUserInput = z.infer<typeof revokeUserSchema>;

export const reactivateUserSchema = z.object({
	userId: z.string().min(1),
});

export type ReactivateUserInput = z.infer<typeof reactivateUserSchema>;

export const invitationIdSchema = z.object({
	invitationId: z.string().min(1),
});

export type InvitationIdInput = z.infer<typeof invitationIdSchema>;

export const acceptInvitationSchema = z.object({
	token: z.string().min(1),
});

export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
