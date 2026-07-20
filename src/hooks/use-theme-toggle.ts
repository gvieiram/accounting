"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

/**
 * `resolvedTheme` só existe depois da hidratação — no servidor não há como saber
 * a preferência guardada. Sem a guarda, quem renderiza a partir dela mostra o
 * rótulo ou o ícone errado no primeiro paint e o React acusa mismatch.
 *
 * Antes da hidratação `isDark` é `false`, ou seja, o claro é o palpite — que é
 * o mesmo `defaultTheme` do ThemeProvider.
 */
export function useThemeToggle() {
	const { resolvedTheme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => setMounted(true), []);

	const isDark = mounted && resolvedTheme === "dark";

	return {
		isDark,
		mounted,
		toggle: () => setTheme(isDark ? "light" : "dark"),
	};
}
