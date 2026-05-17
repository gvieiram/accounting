"use client";

import { useEffect, useRef } from "react";
import { useFormContext } from "react-hook-form";

import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { ClientFormInput } from "@/features/clients/types";
import { formatDocument, stripDocument } from "@/features/clients/utils";
import type { ClientType } from "@/generated/prisma/enums";
import { useMessages } from "@/stores/use-content-store";

type DocumentInputProps = {
	type: ClientType;
};

export function DocumentInput({ type }: DocumentInputProps) {
	const form = useFormContext<ClientFormInput>();
	const messages = useMessages();
	const previousType = useRef(type);

	useEffect(() => {
		if (previousType.current !== type) {
			form.setValue("document", "", {
				shouldDirty: true,
				shouldValidate: true,
			});
			form.setValue("parentClientId", null, {
				shouldDirty: true,
				shouldValidate: true,
			});
			form.setValue("parentDocument", undefined, {
				shouldDirty: true,
				shouldValidate: true,
			});
			previousType.current = type;
		}
	}, [form, type]);

	const fields = messages.admin.clients.form.fields;
	const label = type === "PJ" ? fields.documentCnpj : fields.documentCpf;

	return (
		<FormField
			control={form.control}
			name="document"
			render={({ field }) => (
				<FormItem>
					<FormLabel>{label}</FormLabel>
					<FormControl>
						<Input
							{...field}
							value={formatDocument(type, field.value ?? "")}
							inputMode="numeric"
							autoComplete="off"
							onChange={(event) => {
								const maxLength = type === "PF" ? 11 : 14;
								field.onChange(
									stripDocument(event.target.value).slice(0, maxLength),
								);
							}}
						/>
					</FormControl>
					<FormMessage />
				</FormItem>
			)}
		/>
	);
}
