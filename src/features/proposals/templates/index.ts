import { desenquadramento } from "./desenquadramento";

export const templateRegistry = {
	DESENQUADRAMENTO: desenquadramento,
} as const;

export type RegisteredTemplate =
	(typeof templateRegistry)[keyof typeof templateRegistry];

export const allTemplates = Object.values(templateRegistry);
