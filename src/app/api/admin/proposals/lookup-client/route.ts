import { NextResponse } from "next/server";
import { z } from "zod";
import { findClientByDocument } from "@/features/proposals/queries";
import { getSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";

const bodySchema = z.object({ document: z.string() });

// Route Handlers cannot rely on requireAdmin (which redirects). Return JSON
// 401 so the client picker fetch can surface the error instead of crashing on
// a redirected /login HTML body.
// biome-ignore lint/style/useNamingConvention: Next.js requires uppercase HTTP method exports
export async function POST(request: Request) {
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

	const raw = (await request.json()) as unknown;
	const parsed = bodySchema.safeParse(raw);
	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid body" }, { status: 400 });
	}
	const match = await findClientByDocument(parsed.data.document);
	return NextResponse.json(match);
}
