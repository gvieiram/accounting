"use client";

import { MoreVerticalIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	cancelInvitationAction,
	reactivateUserAction,
	resendInvitationAction,
	revokeUserAction,
} from "@/features/users/actions";
import type { UserListItem } from "@/features/users/types";
import { useMessages } from "@/stores/use-content-store";

type DialogKind = "revoke" | "reactivate" | "cancel" | null;

type Props = {
	row: UserListItem;
	disableRevoke: boolean;
};

export function UserRowMenu({ row, disableRevoke }: Props) {
	const messages = useMessages();
	const {
		rowMenu,
		revokeDialog,
		reactivateDialog,
		cancelInviteDialog,
		resendInvite,
		errors,
	} = messages.admin.users;
	const [open, setOpen] = useState<DialogKind>(null);
	const [isPending, startTransition] = useTransition();

	function runAction(
		fn: () => Promise<{ success: boolean; error?: string }>,
		successMessage: string,
		toastId: string,
	) {
		startTransition(async () => {
			const result = await fn();
			if (result.success) {
				toast.success(successMessage, { id: toastId });
				setOpen(null);
			} else {
				toast.error(result.error || errors.generic, { id: toastId });
			}
		});
	}

	const items = buildItems({
		row,
		disableRevoke,
		onRevoke: () => setOpen("revoke"),
		onReactivate: () => setOpen("reactivate"),
		onResend: () =>
			runAction(
				() => resendInvitationAction({ invitationId: row.id }),
				resendInvite.success,
				"resend-invite",
			),
		onCancel: () => setOpen("cancel"),
		labels: rowMenu,
	});

	if (items.length === 0) return null;

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						aria-label={rowMenu.label}
						disabled={isPending}
					>
						<MoreVerticalIcon aria-hidden="true" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					{items.map((item) => (
						<DropdownMenuItem
							key={item.key}
							variant={item.destructive ? "destructive" : "default"}
							onSelect={(e) => {
								e.preventDefault();
								item.onSelect();
							}}
							disabled={item.disabled}
						>
							{item.label}
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>

			<AlertDialog
				open={open === "revoke"}
				onOpenChange={(o) => !o && setOpen(null)}
			>
				<AlertDialogContent size="sm">
					<AlertDialogHeader>
						<AlertDialogTitle>{revokeDialog.title}</AlertDialogTitle>
						<AlertDialogDescription>
							{revokeDialog.description(row.email)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{revokeDialog.cancel}</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							disabled={isPending}
							onClick={() =>
								runAction(
									() => revokeUserAction({ userId: row.id }),
									revokeDialog.success,
									"revoke-user",
								)
							}
						>
							{revokeDialog.confirm}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog
				open={open === "reactivate"}
				onOpenChange={(o) => !o && setOpen(null)}
			>
				<AlertDialogContent size="sm">
					<AlertDialogHeader>
						<AlertDialogTitle>{reactivateDialog.title}</AlertDialogTitle>
						<AlertDialogDescription>
							{reactivateDialog.description(row.email)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{reactivateDialog.cancel}</AlertDialogCancel>
						<AlertDialogAction
							disabled={isPending}
							onClick={() =>
								runAction(
									() => reactivateUserAction({ userId: row.id }),
									reactivateDialog.success,
									"reactivate-user",
								)
							}
						>
							{reactivateDialog.confirm}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog
				open={open === "cancel"}
				onOpenChange={(o) => !o && setOpen(null)}
			>
				<AlertDialogContent size="sm">
					<AlertDialogHeader>
						<AlertDialogTitle>{cancelInviteDialog.title}</AlertDialogTitle>
						<AlertDialogDescription>
							{cancelInviteDialog.description(row.email)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{cancelInviteDialog.cancel}</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							disabled={isPending}
							onClick={() =>
								runAction(
									() => cancelInvitationAction({ invitationId: row.id }),
									cancelInviteDialog.success,
									"cancel-invite",
								)
							}
						>
							{cancelInviteDialog.confirm}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

type MenuItem = {
	key: string;
	label: string;
	onSelect: () => void;
	destructive?: boolean;
	disabled?: boolean;
};

type BuildArgs = {
	row: UserListItem;
	disableRevoke: boolean;
	onRevoke: () => void;
	onReactivate: () => void;
	onResend: () => void;
	onCancel: () => void;
	labels: {
		revoke: string;
		reactivate: string;
		resendInvite: string;
		cancelInvite: string;
	};
};

function buildItems(args: BuildArgs): MenuItem[] {
	const { row, disableRevoke, labels } = args;

	if (row.kind === "user") {
		if (row.status === "ACTIVE") {
			return [
				{
					key: "revoke",
					label: labels.revoke,
					onSelect: args.onRevoke,
					destructive: true,
					disabled: disableRevoke,
				},
			];
		}
		if (row.status === "REVOKED") {
			return [
				{
					key: "reactivate",
					label: labels.reactivate,
					onSelect: args.onReactivate,
				},
			];
		}
	}

	if (row.kind === "invitation") {
		return [
			{
				key: "resend",
				label: labels.resendInvite,
				onSelect: args.onResend,
			},
			{
				key: "cancel",
				label: labels.cancelInvite,
				onSelect: args.onCancel,
				destructive: true,
			},
		];
	}

	return [];
}
