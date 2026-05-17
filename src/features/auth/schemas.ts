import { z } from "zod";

// User-facing validation messages live here (not in `src/content/messages`)
// because the schema is shared between server (Server Action) and client
// (react-hook-form), and importing the full messages bundle on the server
// pulls in unrelated marketing copy. These strings are also short and
// product-specific to auth, so co-locating with the schema is acceptable.
// If a second locale is ever introduced, lift these to a localised content
// file at that point.
export const loginSchema = z.object({
	email: z
		.string()
		.min(1, "Informe seu e-mail.")
		.email("Informe um e-mail válido.")
		.max(254, "E-mail muito longo (máximo 254 caracteres)."),
	next: z
		.string()
		.startsWith("/")
		.refine((v) => !v.startsWith("//"), {
			message: "next must be a single-leading-slash path",
		})
		.optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
