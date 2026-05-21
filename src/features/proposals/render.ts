import { escapeHtml } from "./escape";
import { formatBRL, formatDateBR } from "./format";
import type { FieldKind, FieldMetadata } from "./types";

export function getNested(obj: unknown, path: string): unknown {
	const keys = path.split(".");
	let current: unknown = obj;
	for (const key of keys) {
		if (current === null || current === undefined) return undefined;
		if (typeof current !== "object") return undefined;
		current = (current as Record<string, unknown>)[key];
	}
	return current;
}

export function renderField(value: unknown, kind: FieldKind): string {
	if (value === null || value === undefined) return "";

	switch (kind) {
		case "text":
			return escapeHtml(String(value));
		case "multiline":
			return escapeHtml(String(value)).replace(/\n/g, "<br>");
		case "currency":
			return formatBRL(typeof value === "number" ? value : Number(value));
		case "date":
			return formatDateBR(value as Date | string);
		case "list":
			if (!Array.isArray(value)) return "";
			return `<ul>${value
				.map((item) => `<li>${escapeHtml(String(item))}</li>`)
				.join("")}</ul>`;
	}
}

export function renderTemplate(
	html: string,
	data: Record<string, unknown>,
	metadata: FieldMetadata,
): string {
	return html.replace(/\{\{([\w.]+)\}\}/g, (_match, path: string) => {
		const value = getNested(data, path);
		const kind = metadata[path]?.kind ?? "text";
		return renderField(value, kind);
	});
}
