"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import { use, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup } from "@/components/ui/field";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { sendLoginMagicLinkAction } from "@/features/auth/actions";
import { type LoginInput, loginSchema } from "@/features/auth/schemas";
import { useMessages } from "@/stores/use-content-store";

type Props = {
	/**
	 * Resolved server-side via `resolveAll()` and passed in. Cheap (already
	 * cached). When `false`, the chooser view is skipped entirely and the
	 * form starts in the magic-link view — there are no other providers to
	 * pick from.
	 */
	showProviderChooser: boolean;
	searchParamsPromise: Promise<{ next?: string; error?: string }>;
};

type View = "chooser" | "magic-link";

export function LoginForm({ showProviderChooser, searchParamsPromise }: Props) {
	const params = use(searchParamsPromise);
	const { auth } = useMessages();
	const [view, setView] = useState<View>(
		showProviderChooser ? "chooser" : "magic-link",
	);
	const [submitted, setSubmitted] = useState(false);

	const form = useForm<LoginInput>({
		resolver: zodResolver(loginSchema),
		defaultValues: {
			email: "",
			// Leave `next` undefined when the user lands without a `?next=`.
			// The server (LoginPage + safeNext) resolves the destination
			// based on the authenticated role at redirect time. Hardcoding
			// `/admin` here would force every login to bounce through the
			// admin tree even for future client users.
			next: params.next?.startsWith("/") ? params.next : undefined,
		},
	});

	// Surface verification/auth errors from the URL via toast. We deliberately
	// don't pipe these into `form.setError` — the errors aren't about the
	// field's value (the user hasn't typed anything yet) so flagging the input
	// as invalid would be misleading. Sonner announces toasts with
	// `aria-live="polite"`, which is appropriate for informational auth
	// feedback. Strip `?error=` from the URL so refresh/back doesn't
	// re-trigger.
	useEffect(() => {
		const message = resolveErrorMessage(params.error, auth.login.errors);
		if (!message) return;

		// Defer to the next tick so the global <Toaster /> has time to subscribe
		// to sonner's ToastState. Without this, toasts fired during the first
		// render are silently dropped because no subscriber is listening yet.
		// See https://github.com/emilkowalski/sonner/issues/168 (and #341, #723).
		const timer = setTimeout(() => {
			toast.error(message, {
				duration: 8000,
				id: `login-error-${params.error}`,
			});
		}, 0);

		const url = new URL(window.location.href);
		url.searchParams.delete("error");
		window.history.replaceState({}, "", url.toString());

		return () => clearTimeout(timer);
	}, [params.error, auth.login.errors]);

	async function onSubmit(values: LoginInput) {
		await sendLoginMagicLinkAction(values);
		setSubmitted(true);
	}

	function backToChooser() {
		form.reset({
			email: "",
			next: params.next?.startsWith("/") ? params.next : undefined,
		});
		setSubmitted(false);
		setView("chooser");
	}

	const isChooser = view === "chooser";

	return (
		<div className="flex flex-col gap-6">
			<Card>
				<CardHeader className="text-center">
					<CardTitle className="text-xl">
						{isChooser ? auth.login.chooser.title : auth.login.magicLink.title}
					</CardTitle>
					<CardDescription>
						{isChooser
							? auth.login.chooser.subtitle
							: auth.login.magicLink.subtitle}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{isChooser ? (
						<ChooserView
							onChooseMagicLink={() => setView("magic-link")}
							messages={auth.login.chooser}
						/>
					) : submitted ? (
						<SuccessView
							title={auth.login.successTitle}
							message={auth.login.successMessage}
						/>
					) : (
						<Form {...form}>
							<form
								onSubmit={form.handleSubmit(onSubmit)}
								noValidate
								className="space-y-4"
							>
								<FormField
									control={form.control}
									name="email"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{auth.login.emailLabel}</FormLabel>
											<FormControl>
												<Input
													type="email"
													autoFocus
													autoComplete="email"
													maxLength={254}
													placeholder={auth.login.emailPlaceholder}
													data-testid="login-email-input"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<Button
									type="submit"
									className="w-full"
									disabled={form.formState.isSubmitting}
									data-testid="login-submit"
								>
									{form.formState.isSubmitting
										? auth.login.submitting
										: auth.login.submit}
								</Button>

								{showProviderChooser ? (
									<FieldDescription className="text-center">
										<button
											type="button"
											onClick={backToChooser}
											className="underline-offset-4 hover:underline"
										>
											{auth.login.magicLink.switchMethod}
										</button>
									</FieldDescription>
								) : null}
							</form>
						</Form>
					)}
				</CardContent>
			</Card>
			<TermsFooter
				agreement={auth.login.terms.agreement}
				termsLabel={auth.login.terms.termsOfService}
				privacyLabel={auth.login.terms.privacyPolicy}
				and={auth.login.terms.and}
			/>
		</div>
	);
}

function ChooserView({
	onChooseMagicLink,
	messages,
}: {
	onChooseMagicLink: () => void;
	messages: {
		magicLinkButton: string;
		appleButton: string;
		googleButton: string;
		comingSoon: string;
	};
}) {
	return (
		<FieldGroup>
			<Field>
				<Button type="button" onClick={onChooseMagicLink}>
					<Mail aria-hidden="true" />
					{messages.magicLinkButton}
				</Button>
				{/*
				 * Apple/Google are intentionally rendered but `disabled` until OAuth
				 * lands in F4 (client portal). Keeping them visible signals upcoming
				 * options without misleading the user into clicking an inert
				 * button. The accessible name carries the "Em breve" suffix so
				 * screen readers convey the disabled rationale (a `title` on a
				 * `disabled` button is unreliable — many browsers skip focus on
				 * disabled controls, so the tooltip never surfaces).
				 */}
				<Button
					variant="outline"
					type="button"
					disabled
					title={messages.comingSoon}
					aria-label={`${messages.appleButton} — ${messages.comingSoon}`}
				>
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
						<title>Apple</title>
						<path
							d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
							fill="currentColor"
						/>
					</svg>
					{messages.appleButton}
				</Button>
				<Button
					variant="outline"
					type="button"
					disabled
					title={messages.comingSoon}
					aria-label={`${messages.googleButton} — ${messages.comingSoon}`}
				>
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
						<title>Google</title>
						<path
							d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
							fill="currentColor"
						/>
					</svg>
					{messages.googleButton}
				</Button>
			</Field>
		</FieldGroup>
	);
}

function SuccessView({ title, message }: { title: string; message: string }) {
	return (
		<div className="space-y-4 text-center">
			<h3 className="font-medium">{title}</h3>
			<p className="text-muted-foreground text-sm">{message}</p>
		</div>
	);
}

function TermsFooter({
	agreement,
	termsLabel,
	privacyLabel,
	and,
}: {
	agreement: string;
	termsLabel: string;
	privacyLabel: string;
	and: string;
}) {
	// Routes `/termos` and `/privacidade` don't exist yet — until they do,
	// render the labels as plain spans rather than dead anchors. This avoids
	// shipping clickable links that lead nowhere and keeps the markup
	// trivially upgradable to <Link href="/termos"> when the pages land.
	// TODO(DUO-XX): swap the spans for <Link> once the marketing routes ship.
	return (
		<FieldDescription className="px-6 text-center">
			{agreement} <span className="underline-offset-4">{termsLabel}</span> {and}{" "}
			<span className="underline-offset-4">{privacyLabel}</span>.
		</FieldDescription>
	);
}

function resolveErrorMessage(
	code: string | undefined,
	errors: ReturnType<typeof useMessages>["auth"]["login"]["errors"],
): string | null {
	if (!code) return null;
	switch (code) {
		case "forbidden":
			return errors.forbidden;
		case "session_invalidated":
			return errors.sessionInvalidated;
		// Better Auth magic-link verification error codes (see
		// node_modules/better-auth/.../plugins/magic-link/index.mjs):
		case "EXPIRED_TOKEN":
			return errors.expiredToken;
		case "INVALID_TOKEN":
			return errors.invalidToken;
		case "ATTEMPTS_EXCEEDED":
			return errors.attemptsExceeded;
		// `new_user_signup_disabled` is intentionally folded into the generic
		// branch: distinguishing it would let an attacker enumerate which
		// emails exist by reading the error message. In our flow it's also
		// unreachable today — `sendMagicLink` suppresses emails for unknown
		// users so no token ever lands on /magic-link/verify. Defence in
		// depth: never differentiate "user exists" from "user doesn't" in
		// any client-visible response.
		case "new_user_signup_disabled":
		case "failed_to_create_user":
			return errors.generic;
		default:
			return errors.generic;
	}
}
