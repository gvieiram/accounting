import type { Template } from "../types";
import { desenquadramento } from "./desenquadramento";

export type RegisteredTemplate = Template;

export const allTemplates: readonly RegisteredTemplate[] = [
	desenquadramento,
] as const;

export const templateRegistry: Record<
	RegisteredTemplate["key"],
	RegisteredTemplate
> = Object.fromEntries(allTemplates.map((t) => [t.key, t])) as Record<
	RegisteredTemplate["key"],
	RegisteredTemplate
>;
