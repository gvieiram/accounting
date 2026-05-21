import { describe, expect, it } from "vitest";
import { escapeHtml } from "./escape";

describe("escapeHtml", () => {
	it("escapes ampersand", () => {
		expect(escapeHtml("a & b")).toBe("a &amp; b");
	});

	it("escapes angle brackets", () => {
		expect(escapeHtml("<script>alert(1)</script>")).toBe(
			"&lt;script&gt;alert(1)&lt;/script&gt;",
		);
	});

	it("escapes double and single quotes", () => {
		expect(escapeHtml(`"hello" 'world'`)).toBe(
			"&quot;hello&quot; &#39;world&#39;",
		);
	});

	it("escapes all five characters in a single string", () => {
		expect(escapeHtml(`<a href="x" data-x='y' />&`)).toBe(
			"&lt;a href=&quot;x&quot; data-x=&#39;y&#39; /&gt;&amp;",
		);
	});

	it("returns empty string for empty input", () => {
		expect(escapeHtml("")).toBe("");
	});

	it("does not double-escape", () => {
		expect(escapeHtml("&amp;")).toBe("&amp;amp;");
	});
});
