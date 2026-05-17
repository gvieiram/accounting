import { messages } from "@/content/messages";

export default function AdminLoading() {
	return (
		<div
			aria-busy="true"
			aria-live="polite"
			className="flex h-full items-center justify-center py-12"
		>
			<div
				role="status"
				aria-label={messages.admin.shell.loading}
				className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"
			/>
		</div>
	);
}
