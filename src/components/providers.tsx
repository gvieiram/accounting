"use client";

import { PostHogProvider } from "@posthog/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { posthog } from "@/lib/posthog/client";

type ProvidersProps = {
	children: React.ReactNode;
};

export function Providers({ children }: ProvidersProps) {
	return (
		<PostHogProvider client={posthog}>
			<ThemeProvider
				attribute="class"
				defaultTheme="light"
				enableSystem={false}
				disableTransitionOnChange
			>
				{children}
				<Toaster position="bottom-right" richColors closeButton />
			</ThemeProvider>
		</PostHogProvider>
	);
}
