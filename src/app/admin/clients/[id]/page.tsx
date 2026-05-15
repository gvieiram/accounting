import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BreadcrumbOverride } from "@/app/admin/_components/breadcrumb-overrides";
import { ClientDetailView } from "@/app/admin/clients/_components/client-detail-view";
import { EditClientSheetTrigger } from "@/app/admin/clients/_components/edit-client-sheet-trigger";
import { getClient } from "@/features/clients/queries";
import {
	additionalContactSchema,
	type ClientFormInput,
} from "@/features/clients/schemas";
import type { ParentClientCandidate } from "@/features/clients/types";
import { requireAdmin } from "@/lib/auth/helpers";

export const metadata: Metadata = {
	title: "Admin - Cliente",
};

type Params = Promise<{ id: string }>;
type ClientRecord = NonNullable<Awaited<ReturnType<typeof getClient>>>;

export default async function ClientDetailPage({ params }: { params: Params }) {
	await requireAdmin();
	const { id } = await params;
	const client = await getClient(id);
	if (!client) notFound();

	const displayName = client.tradeName || client.legalName;
	const initialValues = toInitialValues(client);
	const initialParent = toInitialParent(client);

	return (
		<>
			<BreadcrumbOverride segment={client.id} label={displayName} />
			<ClientDetailView client={client} />
			<EditClientSheetTrigger
				clientId={client.id}
				displayName={displayName}
				initialValues={initialValues}
				initialParent={initialParent}
			/>
		</>
	);
}

function toInitialParent(client: ClientRecord): ParentClientCandidate | null {
	if (!client.parentClient) return null;
	return {
		id: client.parentClient.id,
		legalName: client.parentClient.legalName,
		tradeName: client.parentClient.tradeName,
		document: client.parentClient.document,
	};
}

function toInitialValues(client: ClientRecord): ClientFormInput {
	return {
		type: client.type,
		legalName: client.legalName,
		tradeName: client.tradeName ?? undefined,
		document: client.document,
		taxRegime: client.taxRegime,
		stateRegistration: client.stateRegistration ?? undefined,
		cityRegistration: client.cityRegistration ?? undefined,
		segment: client.segment ?? undefined,
		primaryEmail: client.primaryEmail,
		primaryPhone: client.primaryPhone,
		contactName: client.contactName,
		zipCode: client.zipCode ?? undefined,
		street: client.street ?? undefined,
		number: client.number ?? undefined,
		complement: client.complement ?? undefined,
		neighborhood: client.neighborhood ?? undefined,
		city: client.city ?? undefined,
		state: client.state ?? undefined,
		additionalContacts: parseAdditionalContacts(client.additionalContacts),
		parentClientId: client.parentClientId,
		parentDocument: client.parentClient?.document,
		status: client.status,
		internalNotes: client.internalNotes ?? undefined,
	};
}

function parseAdditionalContacts(
	value: unknown,
): ClientFormInput["additionalContacts"] {
	const result = additionalContactSchema.array().safeParse(value ?? []);
	if (!result.success) {
		console.warn(
			"[clients/detail] Discarded invalid additionalContacts payload",
			result.error.flatten(),
		);
		return [];
	}
	return result.data;
}
