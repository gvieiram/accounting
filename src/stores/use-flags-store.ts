"use client";

import { create } from "zustand";
import type { FlagsState } from "@/lib/flags";

export const useFlagsStore = create<FlagsState>(() => ({}) as FlagsState);

export function useFlag(): FlagsState;
export function useFlag<K extends keyof FlagsState>(key: K): FlagsState[K];
export function useFlag<K extends keyof FlagsState>(key?: K) {
	return useFlagsStore((state) => (key ? state[key] : state));
}
