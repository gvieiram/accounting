import { z } from "zod";
import { defineConfigFlag } from "./define";
import { bannerConfigSchema } from "./schemas/banner";

/**
 * Toggles the admin login chooser. When enabled, the login page presents
 * Magic Link + Apple + Google as method options. When disabled (default),
 * the login form goes straight to the magic-link state — there are no
 * other providers to pick from.
 *
 * Apple/Google buttons are visually present but inert until OAuth is
 * wired up in F4 (client portal).
 */
export const isAdminLoginExtraProvidersEnabled = defineConfigFlag({
	key: "admin-login-extra-providers",
	description: "Mostra Apple/Google no chooser do login do admin",
	schema: z.boolean(),
	defaultValue: false,
});

/**
 * Centralizes the logo text vertically. Boolean visual variant.
 */
export const isLogoTextCentered = defineConfigFlag({
	key: "logo-text-centered",
	description: "Centraliza o texto do logo verticalmente",
	schema: z.boolean(),
	defaultValue: false,
});

/**
 * Variant of the social proof section on the homepage.
 */
export const socialProofType = defineConfigFlag({
	key: "social-proof-type",
	description: "Variante da seção de prova social",
	schema: z.enum(["clients", "credentials", "statement"]),
	defaultValue: "credentials",
});

/**
 * IRPF 2026 promotional banner. The payload from PostHog is a JSON
 * object validated by `bannerConfigSchema`, which collapses
 * out-of-window dates into `null`. Activation is controlled by the
 * `enabled` toggle on the PostHog flag itself (no `active` field
 * in the JSON).
 */
export const irpfBanner = defineConfigFlag({
	key: "irpf-banner",
	description: "Banner promocional do IRPF 2026 (JSON payload)",
	schema: bannerConfigSchema,
	defaultValue: null,
	payload: true,
});

export const allFlags = {
	isAdminLoginExtraProvidersEnabled,
	isLogoTextCentered,
	socialProofType,
	irpfBanner,
} as const;

export type AllFlagsMap = typeof allFlags;
