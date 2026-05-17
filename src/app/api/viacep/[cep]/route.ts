import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { viaCepRateLimitByUser } from "@/lib/ratelimit";
import { lookupCep } from "@/lib/viacep";

// Route Handlers cannot rely on requireAdmin (which redirects). Return JSON
// 401 so the client AddressFields fetch can degrade gracefully instead of
// receiving the /login HTML body and crashing on .json().
// biome-ignore lint/style/useNamingConvention: Next.js requires uppercase HTTP method exports
export async function GET(
	_req: Request,
	{ params }: { params: Promise<{ cep: string }> },
) {
	const session = await getSession();
	if (!session) {
		return NextResponse.json(
			{ ok: false, reason: "unauthorized" },
			{ status: 401 },
		);
	}
	const user = await db.user.findUnique({
		where: { id: session.user.id },
		select: { role: true, revokedAt: true },
	});
	if (!user || user.revokedAt || user.role !== "ADMIN") {
		return NextResponse.json(
			{ ok: false, reason: "unauthorized" },
			{ status: 401 },
		);
	}
	const limit = await viaCepRateLimitByUser.limit(session.user.id);
	if (!limit.success) {
		return NextResponse.json(
			{ ok: false, reason: "rate_limited" },
			{ status: 429 },
		);
	}
	const { cep } = await params;
	const result = await lookupCep(cep);
	return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
