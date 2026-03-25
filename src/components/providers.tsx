"use client";

import { ThemeProvider } from "next-themes";
import { useRef } from "react";
import type { FlagsState } from "@/lib/flags";
import { useFlagsStore } from "@/stores/use-flags-store";

type ProvidersProps = {
	children: React.ReactNode;
	flags?: Partial<FlagsState>;
};

export function Providers({ children, flags }: ProvidersProps) {
	const hydrated = useRef(false);
	if (flags && !hydrated.current) {
		useFlagsStore.setState(flags);
		hydrated.current = true;
	}

	return (
		<ThemeProvider
			attribute="class"
			defaultTheme="light"
			forcedTheme="light"
			disableTransitionOnChange
		>
			{children}
		</ThemeProvider>
	);
}
