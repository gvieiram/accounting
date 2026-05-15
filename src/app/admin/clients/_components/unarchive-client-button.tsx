"use client";

import { ArchiveRestoreIcon } from "lucide-react";
import { useTransition } from "react";
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
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { unarchiveClientAction } from "@/features/clients/actions";
import { useMessages } from "@/stores/use-content-store";

type UnarchiveClientButtonProps = {
	clientId: string;
	archivedBranchCount: number;
};

export function UnarchiveClientButton({
	clientId,
	archivedBranchCount,
}: UnarchiveClientButtonProps) {
	const messages = useMessages();
	const [isPending, startTransition] = useTransition();
	const labels = messages.admin.clients.unarchiveDialog;

	function unarchiveClient() {
		startTransition(async () => {
			const result = await unarchiveClientAction({ clientId });
			if (!result.success) {
				toast.error(result.error);
				return;
			}
			toast.success(labels.success);
		});
	}

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button type="button" variant="ghost" size="icon" className="size-8">
					<ArchiveRestoreIcon aria-hidden="true" className="size-4" />
					<span className="sr-only">{labels.confirm}</span>
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{labels.title}</AlertDialogTitle>
					<AlertDialogDescription>
						{labels.description(archivedBranchCount)}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>{labels.cancel}</AlertDialogCancel>
					<AlertDialogAction disabled={isPending} onClick={unarchiveClient}>
						{labels.confirm}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
