import type { FieldErrors } from "react-hook-form";
import { describe, expect, it } from "vitest";

import {
	CLIENT_FORM_FIELD_TO_TAB,
	CLIENT_FORM_TAB_ORDER,
	computeErrorsByTab,
	countFormErrors,
	firstTabWithError,
} from "./form-tabs";
import type { ClientFormInput } from "./schemas";

type Errors = FieldErrors<ClientFormInput>;

// Minimal stub satisfying react-hook-form's FieldError shape. The helpers only
// look at the *keys* of the errors object — values are opaque to them.
function errorStub(): NonNullable<Errors["legalName"]> {
	return { type: "manual", message: "stub" };
}

describe("CLIENT_FORM_TAB_ORDER", () => {
	it("contains the five tabs in display order", () => {
		expect(CLIENT_FORM_TAB_ORDER).toEqual([
			"identification",
			"contact",
			"address",
			"hierarchy",
			"extras",
		]);
	});
});

describe("CLIENT_FORM_FIELD_TO_TAB", () => {
	it("maps identification fields", () => {
		for (const key of [
			"type",
			"document",
			"legalName",
			"tradeName",
			"status",
		]) {
			expect(CLIENT_FORM_FIELD_TO_TAB[key]).toBe("identification");
		}
	});

	it("maps contact fields including additionalContacts", () => {
		for (const key of [
			"contactName",
			"primaryEmail",
			"primaryPhone",
			"additionalContacts",
		]) {
			expect(CLIENT_FORM_FIELD_TO_TAB[key]).toBe("contact");
		}
	});

	it("maps address fields", () => {
		for (const key of [
			"zipCode",
			"street",
			"number",
			"complement",
			"neighborhood",
			"city",
			"state",
		]) {
			expect(CLIENT_FORM_FIELD_TO_TAB[key]).toBe("address");
		}
	});

	it("maps hierarchy fields", () => {
		expect(CLIENT_FORM_FIELD_TO_TAB.parentClientId).toBe("hierarchy");
		expect(CLIENT_FORM_FIELD_TO_TAB.parentDocument).toBe("hierarchy");
	});

	it("maps extras fields", () => {
		for (const key of [
			"taxRegime",
			"stateRegistration",
			"cityRegistration",
			"segment",
			"internalNotes",
		]) {
			expect(CLIENT_FORM_FIELD_TO_TAB[key]).toBe("extras");
		}
	});
});

describe("computeErrorsByTab", () => {
	it("returns all-zero counts when there are no errors", () => {
		expect(computeErrorsByTab({})).toEqual({
			identification: 0,
			contact: 0,
			address: 0,
			hierarchy: 0,
			extras: 0,
		});
	});

	it("counts each error against the right tab", () => {
		const errors = {
			document: errorStub(),
			legalName: errorStub(),
			primaryEmail: errorStub(),
			zipCode: errorStub(),
			parentClientId: errorStub(),
			internalNotes: errorStub(),
		} as unknown as Errors;

		expect(computeErrorsByTab(errors)).toEqual({
			identification: 2,
			contact: 1,
			address: 1,
			hierarchy: 1,
			extras: 1,
		});
	});

	it("treats `additionalContacts` as a single contact-tab error", () => {
		// react-hook-form surfaces nested array errors under the root key —
		// even when multiple inner rows are invalid, the helper sees only
		// `additionalContacts`.
		const errors = {
			additionalContacts: errorStub(),
		} as unknown as Errors;

		expect(computeErrorsByTab(errors).contact).toBe(1);
	});

	it("ignores keys that aren't part of the form mapping", () => {
		const errors = {
			notAField: errorStub(),
			document: errorStub(),
		} as unknown as Errors;

		const counts = computeErrorsByTab(errors);
		expect(counts.identification).toBe(1);
		expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(1);
	});
});

describe("countFormErrors", () => {
	it("returns 0 for an empty error object", () => {
		expect(countFormErrors({})).toBe(0);
	});

	it("counts each top-level key once", () => {
		const errors = {
			document: errorStub(),
			legalName: errorStub(),
			primaryEmail: errorStub(),
		} as unknown as Errors;

		expect(countFormErrors(errors)).toBe(3);
	});
});

describe("firstTabWithError", () => {
	it("returns undefined when no errors are present", () => {
		expect(firstTabWithError({})).toBeUndefined();
	});

	it("returns the earliest tab in the default order that has an error", () => {
		const errors = {
			internalNotes: errorStub(),
			primaryEmail: errorStub(),
		} as unknown as Errors;

		// contact comes before extras in the default order
		expect(firstTabWithError(errors)).toBe("contact");
	});

	it("respects a custom tab order (e.g. PF without hierarchy)", () => {
		const errors = {
			internalNotes: errorStub(),
			parentClientId: errorStub(),
		} as unknown as Errors;

		const pfOrder = CLIENT_FORM_TAB_ORDER.filter((tab) => tab !== "hierarchy");

		// hierarchy is filtered out, so extras wins despite parentClientId existing
		expect(firstTabWithError(errors, pfOrder)).toBe("extras");
	});
});
