import type { FieldErrors } from "react-hook-form";

import type { ClientFormInput } from "./schemas";

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

export type ClientFormTabId =
	| "identification"
	| "contact"
	| "address"
	| "hierarchy"
	| "extras";

export const CLIENT_FORM_TAB_ORDER: readonly ClientFormTabId[] = [
	"identification",
	"contact",
	"address",
	"hierarchy",
	"extras",
];

// Field-name → tab mapping. Keys are the top-level error keys emitted by
// react-hook-form. Nested arrays (e.g. additionalContacts) surface only the
// root key in `errors`, so the lookup stays flat.
export const CLIENT_FORM_FIELD_TO_TAB: Record<string, ClientFormTabId> = {
	type: "identification",
	document: "identification",
	legalName: "identification",
	tradeName: "identification",
	status: "identification",
	contactName: "contact",
	primaryEmail: "contact",
	primaryPhone: "contact",
	additionalContacts: "contact",
	zipCode: "address",
	street: "address",
	number: "address",
	complement: "address",
	neighborhood: "address",
	city: "address",
	state: "address",
	parentClientId: "hierarchy",
	parentDocument: "hierarchy",
	taxRegime: "extras",
	stateRegistration: "extras",
	cityRegistration: "extras",
	segment: "extras",
	internalNotes: "extras",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Aggregates form errors per tab so the tab strip can render an error dot
 * next to each tab that has at least one failing field. Unknown keys are
 * ignored — any field rendered in the form is expected to be registered in
 * `CLIENT_FORM_FIELD_TO_TAB`.
 */
export function computeErrorsByTab(
	errors: FieldErrors<ClientFormInput>,
): Record<ClientFormTabId, number> {
	const counts: Record<ClientFormTabId, number> = {
		identification: 0,
		contact: 0,
		address: 0,
		hierarchy: 0,
		extras: 0,
	};
	for (const key of Object.keys(errors)) {
		const tab = CLIENT_FORM_FIELD_TO_TAB[key];
		if (tab) counts[tab] += 1;
	}
	return counts;
}

/** Total number of top-level fields currently in an error state. */
export function countFormErrors(errors: FieldErrors<ClientFormInput>): number {
	return Object.keys(errors).length;
}

/**
 * Returns the first tab (in `tabOrder`) that has at least one error. Used to
 * auto-focus the right tab after an invalid submit attempt.
 */
export function firstTabWithError(
	errors: FieldErrors<ClientFormInput>,
	tabOrder: readonly ClientFormTabId[] = CLIENT_FORM_TAB_ORDER,
): ClientFormTabId | undefined {
	const counts = computeErrorsByTab(errors);
	return tabOrder.find((tab) => counts[tab] > 0);
}
