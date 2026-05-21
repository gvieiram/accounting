import type { RenderData } from "./types";

type RenderInput = {
	client: {
		legalName: string;
		document: string;
		primaryPhone?: string | null;
		primaryEmail?: string | null;
	} | null;
	prospectData:
		| {
				type: "PF";
				name: string;
				document: string;
				phone?: string;
				email?: string;
		  }
		| {
				type: "PJ";
				legalName: string;
				document: string;
				phone?: string;
				email?: string;
				contactName?: string;
		  }
		| null;
	editableContent: Record<string, unknown>;
	mainAmount: number | null;
	recurringAmount: number | null;
	currency: string;
	commercialData: Record<string, unknown>;
	expiresAt: Date | null;
};

function formatDocument(raw: string): string {
	const digits = raw.replace(/\D/g, "");
	if (digits.length === 11)
		return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
	if (digits.length === 14)
		return digits.replace(
			/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
			"$1.$2.$3/$4-$5",
		);
	return raw;
}

export function buildRenderData(input: RenderInput): RenderData {
	let name = "";
	let document = "";
	let phone: string | undefined;
	let email: string | undefined;

	if (input.client) {
		name = input.client.legalName;
		document = formatDocument(input.client.document);
		phone = input.client.primaryPhone ?? undefined;
		email = input.client.primaryEmail ?? undefined;
	} else if (input.prospectData) {
		const p = input.prospectData;
		name = p.type === "PF" ? p.name : p.legalName;
		document = formatDocument(p.document);
		phone = p.phone;
		email = p.email;
	}

	return {
		client: { name, document, contact: phone, email, phone },
		commercial: {
			mainAmount: input.mainAmount ?? undefined,
			recurringAmount: input.recurringAmount ?? undefined,
			currency: input.currency,
			...input.commercialData,
		},
		content: input.editableContent,
		proposal: { expiresAt: input.expiresAt ?? undefined },
	};
}
