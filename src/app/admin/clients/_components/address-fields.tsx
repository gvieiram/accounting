"use client";

import { Loader2Icon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { toast } from "sonner";

import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { ClientFormInput } from "@/features/clients/types";
import { formatCep, stripDocument } from "@/features/clients/utils";
import { useMessages } from "@/stores/use-content-store";

type ViaCepData = {
	cep: string;
	street: string;
	neighborhood: string;
	city: string;
	state: string;
};

type ViaCepResponse =
	| { ok: true; data: ViaCepData }
	| { ok: false; reason: string };

const CEP_DEBOUNCE_MS = 500;

type ViaCepFetchOutcome =
	| { kind: "success"; data: ViaCepData }
	| { kind: "rate_limited" }
	| { kind: "failed" }
	| { kind: "aborted" };

async function fetchViaCep(
	cep: string,
	signal: AbortSignal,
): Promise<ViaCepFetchOutcome> {
	try {
		const response = await fetch(`/api/viacep/${cep}`, { signal });
		if (response.status === 429) return { kind: "rate_limited" };
		const result = (await response.json()) as ViaCepResponse;
		if (!response.ok || !result.ok) return { kind: "failed" };
		return { kind: "success", data: result.data };
	} catch (error) {
		if ((error as Error).name === "AbortError") return { kind: "aborted" };
		return { kind: "failed" };
	}
}

export function AddressFields() {
	const form = useFormContext<ClientFormInput>();
	const messages = useMessages();
	const [isLookingUp, setIsLookingUp] = useState(false);
	const fields = messages.admin.clients.form.fields;

	// Tracks the last CEP that resolved successfully (or the form's initial CEP
	// on mount), so we never refetch the same value — and so an edit page that
	// loads with a saved CEP doesn't auto-clobber the saved address.
	const lastLookupRef = useRef<string | null>(
		form.getValues("zipCode") ?? null,
	);

	// Pin the latest `form` and toast message in refs so the lookup effect only
	// depends on `zipCode`. Shadcn's <Form> spreads `{...form}` into the
	// FormProvider, so `useFormContext()` returns a new identity every render
	// — depending on it directly would put the effect in an infinite loop
	// (each setValue re-renders, new form ref, effect re-runs, new timer…).
	const formRef = useRef(form);
	formRef.current = form;
	const rateLimitToastRef = useRef(messages.admin.clients.errors.generic);
	rateLimitToastRef.current = messages.admin.clients.errors.generic;

	const zipCode = useWatch({ control: form.control, name: "zipCode" }) ?? "";

	useEffect(() => {
		const cep = stripDocument(zipCode);
		if (cep.length !== 8) return;
		if (lastLookupRef.current === cep) return;

		const controller = new AbortController();
		const timer = setTimeout(async () => {
			setIsLookingUp(true);
			const outcome = await fetchViaCep(cep, controller.signal);

			if (outcome.kind === "aborted") return;
			setIsLookingUp(false);

			if (outcome.kind === "rate_limited") {
				toast.error(rateLimitToastRef.current, {
					description: "Tente novamente em um minuto.",
				});
				return;
			}
			if (outcome.kind === "failed") return;

			// Successful lookup — replace the address fields with the new CEP's
			// data. Replace (not "fill only if empty") so editing the CEP after the
			// form is populated refreshes the address accordingly.
			lastLookupRef.current = cep;
			const currentForm = formRef.current;
			for (const [name, value] of [
				["street", outcome.data.street],
				["neighborhood", outcome.data.neighborhood],
				["city", outcome.data.city],
				["state", outcome.data.state],
			] as const) {
				currentForm.setValue(name, value, {
					shouldDirty: true,
					shouldValidate: true,
				});
			}
		}, CEP_DEBOUNCE_MS);

		return () => {
			clearTimeout(timer);
			controller.abort();
		};
	}, [zipCode]);

	return (
		<div className="grid gap-4 md:grid-cols-6">
			<FormField
				control={form.control}
				name="zipCode"
				render={({ field }) => (
					<FormItem className="md:col-span-2">
						<FormLabel>{fields.cep}</FormLabel>
						<FormControl>
							<Input
								{...field}
								value={formatCep(field.value ?? "")}
								inputMode="numeric"
								autoComplete="postal-code"
								onChange={(event) =>
									field.onChange(stripDocument(event.target.value).slice(0, 8))
								}
							/>
						</FormControl>
						{isLookingUp ? (
							<p className="flex items-center gap-1.5 text-muted-foreground text-xs">
								<Loader2Icon
									aria-hidden="true"
									className="size-3 animate-spin"
								/>
								{messages.admin.clients.form.hints.cepLookup}
							</p>
						) : null}
						<FormMessage />
					</FormItem>
				)}
			/>
			<TextField
				name="street"
				label={fields.street}
				className="md:col-span-4"
			/>
			<TextField
				name="number"
				label={fields.number}
				className="md:col-span-2"
			/>
			<TextField
				name="complement"
				label={fields.complement}
				className="md:col-span-2"
			/>
			<TextField
				name="neighborhood"
				label={fields.neighborhood}
				className="md:col-span-2"
			/>
			<TextField name="city" label={fields.city} className="md:col-span-4" />
			<TextField
				name="state"
				label={fields.state}
				className="md:col-span-2"
				maxLength={2}
				onChange={(value) => value.toUpperCase()}
			/>
		</div>
	);
}

function TextField({
	name,
	label,
	className,
	maxLength,
	onChange,
}: {
	name: keyof Pick<
		ClientFormInput,
		"street" | "number" | "complement" | "neighborhood" | "city" | "state"
	>;
	label: string;
	className?: string;
	maxLength?: number;
	onChange?: (value: string) => string;
}) {
	const form = useFormContext<ClientFormInput>();

	return (
		<FormField
			control={form.control}
			name={name}
			render={({ field }) => (
				<FormItem className={className}>
					<FormLabel>{label}</FormLabel>
					<FormControl>
						<Input
							{...field}
							value={field.value ?? ""}
							maxLength={maxLength}
							onChange={(event) =>
								field.onChange(
									onChange?.(event.target.value) ?? event.target.value,
								)
							}
						/>
					</FormControl>
					<FormMessage />
				</FormItem>
			)}
		/>
	);
}
