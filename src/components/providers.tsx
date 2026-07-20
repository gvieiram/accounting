"use client";

import { PostHogProvider } from "@posthog/react";
import { usePathname } from "next/navigation";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { posthog } from "@/lib/posthog/client";

type ProvidersProps = {
	children: React.ReactNode;
};

/**
 * O escuro só está pronto no `admin`. O público ainda tem lacunas conhecidas
 * (logo com variante errada, cards sem contraste contra o fundo, banda de CTA
 * em terracota sólida) — ver DUO-67. Até lá o resto do app é travado no claro,
 * inclusive para quem já alternou dentro do admin: a preferência fica guardada,
 * mas não vaza para fora daqui.
 */
const THEMED_PREFIXES = ["/admin"];

export function Providers({ children }: ProvidersProps) {
	const pathname = usePathname();
	const isThemed = THEMED_PREFIXES.some((prefix) =>
		pathname.startsWith(prefix),
	);

	return (
		<PostHogProvider client={posthog}>
			<ThemeProvider
				attribute="class"
				defaultTheme="light"
				enableSystem={false}
				forcedTheme={isThemed ? undefined : "light"}
				disableTransitionOnChange
			>
				{children}
				<Toaster position="bottom-right" richColors closeButton />
			</ThemeProvider>
		</PostHogProvider>
	);
}
