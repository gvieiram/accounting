"use client";

import { useEffect, useRef, useState } from "react";

const HEADER_HEIGHT = 57;
const THRESHOLD = 0.3;

export function useActiveSection(sectionIds: string[]): string | null {
	const [activeSection, setActiveSection] = useState<string | null>(null);
	const intersectingByIdRef = useRef<Map<string, boolean>>(new Map());

	const idsKey = sectionIds.join("\0");

	useEffect(() => {
		const parsedIds = idsKey.length > 0 ? idsKey.split("\0") : [];

		const elements = parsedIds
			.map((id) => document.getElementById(id))
			.filter(Boolean) as HTMLElement[];

		if (elements.length === 0) {
			setActiveSection(null);
			return;
		}

		intersectingByIdRef.current = new Map();

		const updateActiveFromMap = () => {
			const visibleIds = [...intersectingByIdRef.current.entries()]
				.filter(([, isIntersecting]) => isIntersecting)
				.map(([id]) => id);

			if (visibleIds.length === 0) {
				setActiveSection(null);
				return;
			}

			const withRects = visibleIds
				.map((id) => {
					const el = document.getElementById(id);
					return el ? { id, top: el.getBoundingClientRect().top } : null;
				})
				.filter(Boolean) as { id: string; top: number }[];

			if (withRects.length === 0) {
				setActiveSection(null);
				return;
			}

			withRects.sort((a, b) => a.top - b.top);
			setActiveSection(withRects[0].id);
		};

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					intersectingByIdRef.current.set(
						entry.target.id,
						entry.isIntersecting,
					);
				}
				updateActiveFromMap();
			},
			{
				rootMargin: `-${HEADER_HEIGHT}px 0px 0px 0px`,
				threshold: THRESHOLD,
			},
		);

		for (const el of elements) {
			observer.observe(el);
		}

		return () => observer.disconnect();
	}, [idsKey]);

	return activeSection;
}
