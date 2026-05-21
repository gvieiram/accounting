import { describe, expect, it } from "vitest";
import { getNested, renderField, renderTemplate } from "./render";
import type { FieldMetadata } from "./types";

describe("getNested", () => {
	it("returns top-level value", () => {
		expect(getNested({ a: 1 }, "a")).toBe(1);
	});

	it("returns nested value", () => {
		expect(getNested({ a: { b: { c: "x" } } }, "a.b.c")).toBe("x");
	});

	it("returns undefined for missing path", () => {
		expect(getNested({ a: 1 }, "b")).toBeUndefined();
		expect(getNested({ a: { b: 1 } }, "a.c")).toBeUndefined();
	});

	it("returns undefined for null intermediate", () => {
		expect(getNested({ a: null }, "a.b")).toBeUndefined();
	});
});

describe("renderField", () => {
	it("renders text with escape", () => {
		expect(renderField("a <b>", "text")).toBe("a &lt;b&gt;");
	});

	it("renders multiline with <br> for newlines", () => {
		expect(renderField("line1\nline2", "multiline")).toBe("line1<br>line2");
	});

	it("renders multiline with escape applied before <br>", () => {
		expect(renderField("<a>\n<b>", "multiline")).toBe(
			"&lt;a&gt;<br>&lt;b&gt;",
		);
	});

	it("renders currency as BRL", () => {
		const output = renderField(1500, "currency");
		expect(output).toMatch(/R\$.*1\.500,00/);
	});

	it("renders date as dd/MM/yyyy", () => {
		expect(renderField(new Date("2026-05-19T12:00:00Z"), "date")).toBe(
			"19/05/2026",
		);
	});

	it("renders list as <ul><li>", () => {
		expect(renderField(["a", "b <c>"], "list")).toBe(
			"<ul><li>a</li><li>b &lt;c&gt;</li></ul>",
		);
	});

	it("renders null/undefined as empty string", () => {
		expect(renderField(null, "text")).toBe("");
		expect(renderField(undefined, "multiline")).toBe("");
		expect(renderField(null, "list")).toBe("");
	});

	it("renders non-array as empty for list kind", () => {
		expect(renderField("not-an-array", "list")).toBe("");
	});
});

describe("renderTemplate", () => {
	const metadata: FieldMetadata = {
		"content.greeting": { kind: "text", label: "Saudação", section: "intro" },
		"content.body": { kind: "multiline", label: "Corpo", section: "intro" },
		"commercial.mainAmount": {
			kind: "currency",
			label: "Valor",
			section: "comercial",
		},
	};

	it("replaces a single placeholder", () => {
		const html = "<p>{{content.greeting}}</p>";
		const data = {
			content: { greeting: "Olá" },
			commercial: {},
			client: {},
			proposal: {},
		};
		expect(renderTemplate(html, data, metadata)).toBe("<p>Olá</p>");
	});

	it("replaces multiple placeholders", () => {
		const html =
			"<p>{{content.greeting}}, valor {{commercial.mainAmount}}</p>";
		const data = {
			content: { greeting: "Olá" },
			commercial: { mainAmount: 1500 },
			client: {},
			proposal: {},
		};
		const result = renderTemplate(html, data, metadata);
		expect(result).toContain("<p>Olá, valor R$");
		expect(result).toContain("1.500,00");
	});

	it("escapes user content in text fields", () => {
		const html = "<p>{{content.greeting}}</p>";
		const data = {
			content: { greeting: "<script>x</script>" },
			commercial: {},
			client: {},
			proposal: {},
		};
		expect(renderTemplate(html, data, metadata)).toBe(
			"<p>&lt;script&gt;x&lt;/script&gt;</p>",
		);
	});

	it("renders multiline with <br>", () => {
		const html = "<p>{{content.body}}</p>";
		const data = {
			content: { body: "linha1\nlinha2" },
			commercial: {},
			client: {},
			proposal: {},
		};
		expect(renderTemplate(html, data, metadata)).toBe(
			"<p>linha1<br>linha2</p>",
		);
	});

	it("renders empty string for missing data", () => {
		const html = "<p>{{content.greeting}}</p>";
		const data = { content: {}, commercial: {}, client: {}, proposal: {} };
		expect(renderTemplate(html, data, metadata)).toBe("<p></p>");
	});

	it("infers text kind from string when metadata is missing", () => {
		const html = "<p>{{client.name}}</p>";
		const data = {
			content: {},
			commercial: {},
			client: { name: "<b>Acme</b>" },
			proposal: {},
		};
		expect(renderTemplate(html, data, metadata)).toBe(
			"<p>&lt;b&gt;Acme&lt;/b&gt;</p>",
		);
	});

	it("infers currency from number when metadata is missing", () => {
		const html = "<p>{{commercial.mainAmount}}</p>";
		const data = {
			content: {},
			commercial: { mainAmount: 1500 },
			client: {},
			proposal: {},
		};
		const result = renderTemplate(html, data, metadata);
		expect(result).toMatch(/R\$.*1\.500,00/);
	});

	it("infers date from Date when metadata is missing", () => {
		const html = "<p>{{proposal.expiresAt}}</p>";
		const data = {
			content: {},
			commercial: {},
			client: {},
			proposal: { expiresAt: new Date("2026-05-19T12:00:00Z") },
		};
		expect(renderTemplate(html, data, metadata)).toBe("<p>19/05/2026</p>");
	});

	it("infers list from array when metadata is missing", () => {
		const html = "<p>{{commercial.items}}</p>";
		const data = {
			content: {},
			commercial: { items: ["a", "b"] },
			client: {},
			proposal: {},
		};
		expect(renderTemplate(html, data, metadata)).toBe(
			"<p><ul><li>a</li><li>b</li></ul></p>",
		);
	});
});
