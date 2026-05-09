import type { Metadata } from "next";

import { messages } from "@/content/messages";
import { listUsers } from "@/features/users/queries";
import { requireAdmin } from "@/lib/auth/helpers";
import { InviteUserDialog } from "./_components/invite-user-dialog";
import { UsersTable } from "./_components/users-table";

export const metadata: Metadata = {
	title: "Admin - Usuários",
};

export default async function UsersPage() {
	const session = await requireAdmin();
	const users = await listUsers();
	const { admin } = messages;

	return (
		<>
			<header className="flex items-center justify-between gap-4">
				<div className="flex flex-col gap-1">
					<h1 className="font-heading text-3xl">{admin.users.title}</h1>
					<p className="text-muted-foreground">{admin.users.subtitle}</p>
				</div>
				<InviteUserDialog triggerLabel={admin.users.invite} />
			</header>
			<UsersTable users={users} currentUserId={session.user.id} />
		</>
	);
}
