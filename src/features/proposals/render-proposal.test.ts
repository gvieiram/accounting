import { describe, expect, it } from "vitest";
import { buildRenderData } from "./render-proposal";

describe("buildRenderData", () => {
	it("uses client when proposal has clientId", () => {
		const data = buildRenderData({
			client: {
				legalName: "Acme",
				document: "12345678000190",
				primaryPhone: "48 99999",
				primaryEmail: "x@y.com",
			},
			prospectData: null,
			editableContent: { summary: { text: "olá" } },
			mainAmount: 500,
			recurringAmount: 400,
			currency: "BRL",
			commercialData: { paymentTerms: "PIX" },
			expiresAt: new Date("2026-06-01"),
		});
		expect(data.client.name).toBe("Acme");
		expect(data.client.document).toBe("12.345.678/0001-90");
		expect(data.commercial.mainAmount).toBe(500);
		expect(data.content).toEqual({ summary: { text: "olá" } });
	});

	it("uses prospectData PF when client is null", () => {
		const data = buildRenderData({
			client: null,
			prospectData: { type: "PF", name: "Maria", document: "12345678909" },
			editableContent: {},
			mainAmount: null,
			recurringAmount: null,
			currency: "BRL",
			commercialData: {},
			expiresAt: null,
		});
		expect(data.client.name).toBe("Maria");
		expect(data.client.document).toBe("123.456.789-09");
	});

	it("formats CNPJ for PJ prospect", () => {
		const data = buildRenderData({
			client: null,
			prospectData: {
				type: "PJ",
				legalName: "Foo SA",
				document: "11222333000181",
			},
			editableContent: {},
			mainAmount: null,
			recurringAmount: null,
			currency: "BRL",
			commercialData: {},
			expiresAt: null,
		});
		expect(data.client.name).toBe("Foo SA");
		expect(data.client.document).toBe("11.222.333/0001-81");
	});
});
