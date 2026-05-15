"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import type * as React from "react";
import { useFieldArray, useFormContext } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { MAX_ADDITIONAL_CONTACTS } from "@/features/clients/constants";
import type { ClientFormInput } from "@/features/clients/types";
import { formatPhoneBR, stripDocument } from "@/features/clients/utils";
import { cn } from "@/lib/utils";
import { useMessages } from "@/stores/use-content-store";

export function AdditionalContactsField() {
	const form = useFormContext<ClientFormInput>();
	const messages = useMessages();
	const fields = messages.admin.clients.form.fields;
	const {
		fields: contacts,
		append,
		remove,
	} = useFieldArray({
		control: form.control,
		name: "additionalContacts",
	});

	return (
		<div className="grid gap-3">
			<div className="flex items-center justify-end gap-3">
				<div className="flex items-center gap-2">
					<span className="text-muted-foreground text-xs">
						{contacts.length}/{MAX_ADDITIONAL_CONTACTS}
					</span>
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={contacts.length >= MAX_ADDITIONAL_CONTACTS}
						onClick={() => append({ name: "", email: "", phone: "" })}
					>
						<PlusIcon aria-hidden="true" className="size-4" />
						{messages.common.actions.add}
					</Button>
				</div>
			</div>
			{contacts.length === 0 ? null : (
				<div className="grid gap-4">
					{contacts.map((contact, index) => (
						<div
							key={contact.id}
							className="grid gap-3 rounded-md border bg-muted/20 p-3 md:grid-cols-12"
						>
							<ContactInput
								name={`additionalContacts.${index}.name`}
								label={fields.additionalContactName}
								className="md:col-span-3"
							/>
							<ContactInput
								name={`additionalContacts.${index}.role`}
								label={fields.additionalContactRole}
								className="md:col-span-2"
							/>
							<ContactInput
								name={`additionalContacts.${index}.email`}
								label={fields.additionalContactEmail}
								className="md:col-span-3"
								type="email"
							/>
							<ContactInput
								name={`additionalContacts.${index}.phone`}
								label={fields.additionalContactPhone}
								className="md:col-span-3"
								inputMode="numeric"
								formatValue={formatPhoneBR}
								onChange={(value) => stripDocument(value).slice(0, 11)}
							/>
							<div className="flex items-end md:col-span-1">
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="size-9"
									onClick={() => remove(index)}
									aria-label={messages.common.actions.remove}
								>
									<Trash2Icon aria-hidden="true" className="size-4" />
								</Button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

function ContactInput({
	name,
	label,
	className,
	type = "text",
	inputMode,
	formatValue,
	onChange,
}: {
	name:
		| `additionalContacts.${number}.name`
		| `additionalContacts.${number}.role`
		| `additionalContacts.${number}.email`
		| `additionalContacts.${number}.phone`;
	label: string;
	className?: string;
	type?: string;
	inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
	formatValue?: (value: string) => string;
	onChange?: (value: string) => string;
}) {
	const form = useFormContext<ClientFormInput>();

	return (
		<FormField
			control={form.control}
			name={name}
			render={({ field }) => (
				<FormItem className={cn("min-w-0", className)}>
					<FormLabel>{label}</FormLabel>
					<FormControl>
						<Input
							{...field}
							type={type}
							inputMode={inputMode}
							value={formatValue?.(field.value ?? "") ?? field.value ?? ""}
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
