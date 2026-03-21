"use client";

import { create } from "zustand";
import { company } from "@/content/company";
import { messages } from "@/content/messages";

type ContentStoreState = {
	company: typeof company;
	messages: typeof messages;
};

export const useContentStore = create<ContentStoreState>(() => ({
	company,
	messages,
}));

export function useCompany() {
	return useContentStore((state) => state.company);
}

export function useMessages() {
	return useContentStore((state) => state.messages);
}
