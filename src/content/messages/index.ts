import { admin } from "@/content/messages/admin";
import { app } from "@/content/messages/app";
import { auth } from "@/content/messages/auth";
import { common } from "@/content/messages/common";
import { home } from "@/content/messages/home";
import { irpf } from "@/content/messages/irpf";
import { notFound } from "@/content/messages/not-found";

export const messages = {
	admin,
	app,
	auth,
	common,
	home,
	irpf,
	notFound,
} as const;
