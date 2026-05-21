import { notFound } from "next/navigation";

import { getProposalById } from "@/features/proposals/queries";
import { renderTemplate } from "@/features/proposals/render";
import { buildRenderData } from "@/features/proposals/render-proposal";
import { templateRegistry } from "@/features/proposals/templates";
import { requireAdmin } from "@/lib/auth/helpers";

// biome-ignore lint/style/useNamingConvention: Next.js requires uppercase HTTP method exports
export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	await requireAdmin();

	const { id } = await params;
	const proposal = await getProposalById(id);
	if (!proposal) notFound();

	const registered = templateRegistry[proposal.template.key];
	if (!registered) {
		throw new Error(`Template ${proposal.template.key} not in registry`);
	}

	const editableContent =
		(proposal.editableContent as Record<string, unknown> | null) ?? {};
	const commercialData =
		(proposal.commercialData as Record<string, unknown> | null) ?? {};

	const data = buildRenderData({
		client: proposal.client,
		prospectData: proposal.prospectData as Parameters<
			typeof buildRenderData
		>[0]["prospectData"],
		editableContent,
		mainAmount: proposal.mainAmount ? Number(proposal.mainAmount) : null,
		recurringAmount: proposal.recurringAmount
			? Number(proposal.recurringAmount)
			: null,
		currency: proposal.currency,
		commercialData,
		expiresAt: proposal.expiresAt,
	});

	const html = renderTemplate(
		registered.html,
		data as unknown as Record<string, unknown>,
		registered.metadata,
	);

	return new Response(html, {
		status: 200,
		headers: {
			"Content-Type": "text/html; charset=utf-8",
			"Cache-Control": "no-store",
			"X-Robots-Tag": "noindex, nofollow, nocache",
		},
	});
}
