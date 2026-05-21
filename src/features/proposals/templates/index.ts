import type { Template } from "../types";
import { desenquadramento } from "./desenquadramento";

export type RegisteredTemplate = Template;

export const allTemplates: readonly RegisteredTemplate[] = [
	desenquadramento,
] as const;
