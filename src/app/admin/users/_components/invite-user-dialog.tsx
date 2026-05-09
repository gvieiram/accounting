"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { useMessages } from "@/stores/use-content-store";
import { InviteUserForm } from "./invite-user-form";

type InviteUserDialogProps = {
	triggerLabel: string;
};

export function InviteUserDialog({ triggerLabel }: InviteUserDialogProps) {
	const messages = useMessages();
	const { inviteDialog } = messages.admin.users;
	const [open, setOpen] = useState(false);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button>{triggerLabel}</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{inviteDialog.title}</DialogTitle>
					<DialogDescription>{inviteDialog.description}</DialogDescription>
				</DialogHeader>
				<InviteUserForm onSuccess={() => setOpen(false)} />
			</DialogContent>
		</Dialog>
	);
}
