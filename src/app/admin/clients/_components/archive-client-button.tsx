"use client";

import { ArchiveIcon } from "lucide-react";
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
import { archiveClientAction } from "@/features/clients/actions";
import { useMessages } from "@/stores/use-content-store";

type ArchiveClientButtonProps = {
	clientId: string;
	branchCount: number;
};

export function ArchiveClientButton({
	clientId,
	branchCount,
}: ArchiveClientButtonProps) {
	const messages = useMessages();
	const [isPending, startTransition] = useTransition();
	const labels = messages.admin.clients.archiveDialog;

	function archiveClient() {
		startTransition(async () => {
			const result = await archiveClientAction({ clientId });
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
					<ArchiveIcon aria-hidden="true" className="size-4" />
					<span className="sr-only">{labels.confirm}</span>
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{labels.title}</AlertDialogTitle>
					<AlertDialogDescription>
						{labels.description(branchCount)}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>{labels.cancel}</AlertDialogCancel>
					<AlertDialogAction disabled={isPending} onClick={archiveClient}>
						{labels.confirm}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
