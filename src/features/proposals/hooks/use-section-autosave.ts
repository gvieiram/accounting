"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { saveProposalSection } from "../actions";

export type SaveState = "idle" | "saving" | "saved" | "error";

export function useSectionAutosave(opts: {
	proposalId: string;
	sectionKey: string;
	debounceMs?: number;
}) {
	const { proposalId, sectionKey, debounceMs = 800 } = opts;
	const [state, setState] = useState<SaveState>("idle");
	const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
	const [error, setError] = useState<string | null>(null);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const lastPayload = useRef<Record<string, unknown> | null>(null);

	const queueSave = useCallback(
		(data: Record<string, unknown>) => {
			lastPayload.current = data;
			if (timer.current) clearTimeout(timer.current);
			timer.current = setTimeout(async () => {
				setState("saving");
				setError(null);
				const r = await saveProposalSection({
					proposalId,
					sectionKey,
					sectionData: data,
				});
				if (r.success) {
					setState("saved");
					setLastSavedAt(new Date());
				} else {
					setState("error");
					setError(r.error);
				}
			}, debounceMs);
		},
		[proposalId, sectionKey, debounceMs],
	);

	const retry = useCallback(() => {
		if (lastPayload.current !== null) queueSave(lastPayload.current);
	}, [queueSave]);

	useEffect(
		() => () => {
			if (timer.current) clearTimeout(timer.current);
		},
		[],
	);

	return { state, lastSavedAt, error, queueSave, retry };
}
