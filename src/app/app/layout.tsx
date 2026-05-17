import type { Metadata } from "next";

import { messages } from "@/content/messages";
import { requireClient } from "@/lib/auth/helpers";

export const metadata: Metadata = {
	robots: { index: false, follow: false, nocache: true },
	title: messages.app.metadata.title,
	description: messages.app.metadata.description,
};

export const dynamic = "force-dynamic";

export default async function AppLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	await requireClient();

	return <div className="min-h-svh bg-background">{children}</div>;
}
