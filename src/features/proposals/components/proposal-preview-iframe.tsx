"use client";

export function ProposalPreviewIframe({ html }: { html: string }) {
	return (
		<iframe
			srcDoc={html}
			title="Preview da proposta"
			sandbox=""
			className="h-full w-full rounded-md border bg-white"
		/>
	);
}
