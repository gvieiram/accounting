import { notFound } from "next/navigation";

import { getProposalPublishedVersion } from "@/features/proposals/queries";
import { requireAdmin } from "@/lib/auth/helpers";

// biome-ignore lint/style/useNamingConvention: Next.js requires uppercase HTTP method exports
export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ id: string; versionId: string }> },
) {
	await requireAdmin();

	const { id, versionId } = await params;
	const version = await getProposalPublishedVersion(id, versionId);
	if (!version) notFound();

	return new Response(version.renderedHtml, {
		status: 200,
		headers: {
			"Content-Type": "text/html; charset=utf-8",
			"Cache-Control": "no-store",
			"X-Robots-Tag": "noindex, nofollow, nocache",
		},
	});
}
