import { describe, expect, it } from "vitest";
import { z } from "zod";
import { allTemplates } from "./templates";

/** Extracts all `{{path}}` placeholders from HTML, deduplicated. */
function extractPlaceholders(html: string): string[] {
	const matches = html.matchAll(/\{\{([\w.]+)\}\}/g);
	const set = new Set<string>();
	for (const m of matches) {
		set.add(m[1]);
	}
	return Array.from(set).sort();
}

/** Walks a Zod object schema and returns all leaf paths, prefixed by `prefix`. */
function flattenZodPaths(schema: z.ZodTypeAny, prefix = "content"): string[] {
	if (schema instanceof z.ZodObject) {
		const shape = schema.shape as Record<string, z.ZodTypeAny>;
		return Object.entries(shape).flatMap(([key, child]) =>
			flattenZodPaths(child, prefix ? `${prefix}.${key}` : key),
		);
	}
	return [prefix];
}

describe("template parity", () => {
	it.each(
		allTemplates,
	)("$key — placeholders, schema, and metadata stay in sync", (template) => {
		const placeholders = extractPlaceholders(template.html);
		const schemaPaths = flattenZodPaths(template.schema).sort();
		const metadataPaths = Object.keys(template.metadata).sort();

		expect(metadataPaths).toEqual(schemaPaths);

		const contentPlaceholders = placeholders
			.filter((p) => p.startsWith("content."))
			.sort();
		expect(contentPlaceholders).toEqual(schemaPaths);

		for (const path of schemaPaths) {
			expect(template.html).toContain(`{{${path}}}`);
		}
	});

	it.each(
		allTemplates,
	)("$key — defaultContent satisfies the schema", (template) => {
		const result = template.schema.safeParse(template.defaultContent);
		if (!result.success) {
			console.error(result.error.flatten());
		}
		expect(result.success).toBe(true);
	});
});
