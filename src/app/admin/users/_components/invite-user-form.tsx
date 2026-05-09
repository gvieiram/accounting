"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { inviteUserAction } from "@/features/users/actions";
import {
	type InviteUserInput,
	inviteUserSchema,
} from "@/features/users/schemas";
import { useMessages } from "@/stores/use-content-store";

type InviteUserFormProps = {
	onSuccess?: () => void;
};

export function InviteUserForm({ onSuccess }: InviteUserFormProps) {
	const messages = useMessages();
	const { inviteDialog, errors } = messages.admin.users;
	const { common } = messages;

	const form = useForm<InviteUserInput>({
		resolver: zodResolver(inviteUserSchema),
		defaultValues: { email: "", name: "" },
	});

	async function onSubmit(values: InviteUserInput) {
		const result = await inviteUserAction(values);
		if (result.success) {
			toast.success(inviteDialog.success, { id: "invite-user-success" });
			onSuccess?.();
		} else {
			toast.error(result.error || errors.generic, {
				id: "invite-user-error",
			});
		}
	}

	return (
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
							<FormLabel>{inviteDialog.emailLabel}</FormLabel>
							<FormControl>
								<Input
									type="email"
									autoComplete="email"
									maxLength={254}
									{...field}
									disabled={form.formState.isSubmitting}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="name"
					render={({ field }) => (
						<FormItem>
							<FormLabel>
								{inviteDialog.nameLabel}{" "}
								<span className="font-normal text-muted-foreground">
									{common.terms.optional}
								</span>
							</FormLabel>
							<FormControl>
								<Input
									type="text"
									maxLength={120}
									{...field}
									disabled={form.formState.isSubmitting}
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
				>
					{form.formState.isSubmitting
						? common.forms.submit.sending
						: inviteDialog.submit}
				</Button>
			</form>
		</Form>
	);
}
