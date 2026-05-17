"use client";

import { Button } from "@/components/ui/button";
import { useMessages } from "@/stores/use-content-store";

export default function AdminError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	const { admin } = useMessages();

	console.error("[admin/error.tsx]", {
		name: error.constructor.name,
		digest: error.digest,
	});

	return (
		<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
			<h2 className="font-medium">{admin.errors.pageBoundary}</h2>
			<p className="mt-1 text-muted-foreground text-sm">
				{admin.errors.pageBoundaryDescription}
			</p>
			<Button variant="outline" onClick={reset} className="mt-4">
				{admin.errors.retry}
			</Button>
		</div>
	);
}
