import { describe, expect, it } from "vitest";
import {
	createProposalDraftSchema,
	prospectDataSchema,
	publishProposalCommercialSchema,
	saveProposalSectionSchema,
} from "./schemas";

describe("prospectDataSchema", () => {
	it("accepts valid PF", () => {
		expect(
			prospectDataSchema.safeParse({
				type: "PF",
				name: "Maria",
				document: "12345678909",
			}).success,
		).toBe(true);
	});
	it("accepts valid PJ", () => {
		expect(
			prospectDataSchema.safeParse({
				type: "PJ",
				legalName: "Acme",
				document: "12345678000190",
				taxRegime: "SIMPLES_NACIONAL",
			}).success,
		).toBe(true);
	});
	it("rejects PJ without taxRegime", () => {
		expect(
			prospectDataSchema.safeParse({
				type: "PJ",
				legalName: "Acme",
				document: "12345678000190",
			}).success,
		).toBe(false);
	});
	it("rejects unknown type", () => {
		expect(prospectDataSchema.safeParse({ type: "X" }).success).toBe(false);
	});
});

describe("createProposalDraftSchema", () => {
	it("accepts with clientId only", () => {
		expect(
			createProposalDraftSchema.safeParse({
				templateKey: "DESENQUADRAMENTO",
				clientId: "cuid-1",
			}).success,
		).toBe(true);
	});
	it("accepts with prospectData only", () => {
		expect(
			createProposalDraftSchema.safeParse({
				templateKey: "DESENQUADRAMENTO",
				prospectData: {
					type: "PF",
					name: "Maria",
					document: "12345678909",
				},
			}).success,
		).toBe(true);
	});
	it("rejects with both", () => {
		expect(
			createProposalDraftSchema.safeParse({
				templateKey: "DESENQUADRAMENTO",
				clientId: "cuid-1",
				prospectData: { type: "PF", name: "x", document: "12345678909" },
			}).success,
		).toBe(false);
	});
	it("rejects with neither", () => {
		expect(
			createProposalDraftSchema.safeParse({ templateKey: "DESENQUADRAMENTO" })
				.success,
		).toBe(false);
	});
});

describe("saveProposalSectionSchema", () => {
	it("accepts", () => {
		expect(
			saveProposalSectionSchema.safeParse({
				proposalId: "cuid-1",
				sectionKey: "summary",
				sectionData: { text: "x" },
			}).success,
		).toBe(true);
	});
	it("rejects empty sectionKey", () => {
		expect(
			saveProposalSectionSchema.safeParse({
				proposalId: "cuid-1",
				sectionKey: "",
				sectionData: {},
			}).success,
		).toBe(false);
	});
});

describe("publishProposalCommercialSchema", () => {
	it("requires mainAmount for ONE_OFF", () => {
		expect(
			publishProposalCommercialSchema.safeParse({
				category: "ONE_OFF",
				currency: "BRL",
				expiresAt: "2026-06-15",
			}).success,
		).toBe(false);
	});
	it("requires recurringAmount for CONTINUOUS", () => {
		expect(
			publishProposalCommercialSchema.safeParse({
				category: "CONTINUOUS",
				mainAmount: 100,
				currency: "BRL",
				expiresAt: "2026-06-15",
			}).success,
		).toBe(false);
	});
	it("accepts ONE_OFF + mainAmount", () => {
		expect(
			publishProposalCommercialSchema.safeParse({
				category: "ONE_OFF",
				mainAmount: 500,
				currency: "BRL",
				expiresAt: "2026-06-15",
			}).success,
		).toBe(true);
	});
	it("accepts CONTINUOUS + recurringAmount", () => {
		expect(
			publishProposalCommercialSchema.safeParse({
				category: "CONTINUOUS",
				recurringAmount: 400,
				currency: "BRL",
				expiresAt: "2026-06-15",
			}).success,
		).toBe(true);
	});
});
