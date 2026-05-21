"use client";
import { useState } from "react";
import { ProposalPreviewIframe } from "./proposal-preview-iframe";
import { SectionForm } from "./section-form";

type Section = {
	key: string;
	label: string;
	fields: {
		path: string;
		label: string;
		kind: "text" | "multiline" | "currency" | "date" | "list";
	}[];
	initial: Record<string, unknown>;
};

export function ProposalEditorShell({
	proposalId,
	sections,
	previewHtml,
}: {
	proposalId: string;
	sections: Section[];
	previewHtml: string;
}) {
	const [activeKey, setActiveKey] = useState<string | null>(
		sections[0]?.key ?? null,
	);
	const active = sections.find((s) => s.key === activeKey);

	return (
		<div className="grid h-[calc(100vh-160px)] grid-cols-12 gap-4">
			<aside className="col-span-2 space-y-1 border-r pr-3">
				{sections.map((s) => (
					<button
						type="button"
						key={s.key}
						onClick={() => setActiveKey(s.key)}
						className={`block w-full rounded px-2 py-1 text-left text-sm ${
							s.key === activeKey ? "bg-muted font-semibold" : ""
						}`}
					>
						{s.label}
					</button>
				))}
			</aside>
			<section className="col-span-5 overflow-auto">
				{active && (
					<SectionForm
						proposalId={proposalId}
						sectionKey={active.key}
						fields={active.fields}
						initial={active.initial}
					/>
				)}
			</section>
			<section className="col-span-5">
				<ProposalPreviewIframe html={previewHtml} />
			</section>
		</div>
	);
}
