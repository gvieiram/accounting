import { messages } from "@/content/messages";
import { requireAdmin } from "@/lib/auth/helpers";

export default async function AdminDashboardPage() {
	const session = await requireAdmin();
	const { admin } = messages;
	const trimmedName = session.user.name?.trim();
	const firstName =
		trimmedName && trimmedName.length > 0 ? trimmedName.split(" ")[0] : "admin";

	return (
		<>
			<header className="flex flex-col gap-1">
				<h1 className="font-heading text-3xl">{admin.dashboard.title}</h1>
				<p className="text-muted-foreground">
					{admin.dashboard.welcome(firstName)}
				</p>
			</header>
			<div className="grid auto-rows-min gap-4 md:grid-cols-3">
				<div className="aspect-video rounded-xl bg-muted/50" />
				<div className="aspect-video rounded-xl bg-muted/50" />
				<div className="aspect-video rounded-xl bg-muted/50" />
			</div>
			<div className="min-h-[60vh] flex-1 rounded-xl bg-muted/50" />
		</>
	);
}
