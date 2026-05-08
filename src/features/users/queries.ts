import "server-only";

import { db } from "@/lib/db";
import type { UserListItem } from "./types";

/**
 * List all admin identities visible on `/admin/users`: real `User` rows
 * (active or revoked) plus pending/expired/cancelled `Invitation`s that
 * haven't been accepted. Cancelled and accepted invitations are filtered
 * out — they have no actionable state for the admin.
 *
 * Sort order in the unified list:
 *  1. Active users (most recently created first)
 *  2. Pending invitations (most recently created first)
 *  3. Expired invitations
 *  4. Revoked users
 *
 * The status filter on the page operates on the derived `status` field,
 * not on the raw row source.
 */
export async function listUsers(): Promise<UserListItem[]> {
	const [users, invitations] = await Promise.all([
		db.user.findMany({
			where: { role: "ADMIN" },
			select: {
				id: true,
				email: true,
				name: true,
				createdAt: true,
				revokedAt: true,
				sessions: {
					select: { createdAt: true },
					orderBy: { createdAt: "desc" },
					take: 1,
				},
			},
		}),
		db.invitation.findMany({
			where: { acceptedAt: null, revokedAt: null },
			select: {
				id: true,
				email: true,
				name: true,
				createdAt: true,
				expiresAt: true,
			},
		}),
	]);

	const now = new Date();

	const userItems: UserListItem[] = users.map((u) => ({
		id: u.id,
		kind: "user",
		email: u.email,
		name: u.name,
		createdAt: u.createdAt,
		status: u.revokedAt ? "REVOKED" : "ACTIVE",
		lastAccessAt: u.sessions[0]?.createdAt ?? null,
		expiresAt: null,
		inviteExpired: false,
	}));

	const invitationItems: UserListItem[] = invitations.map((i) => ({
		id: i.id,
		kind: "invitation",
		email: i.email,
		name: i.name,
		createdAt: i.createdAt,
		status: "INVITED",
		lastAccessAt: null,
		expiresAt: i.expiresAt,
		inviteExpired: i.expiresAt < now,
	}));

	return [...userItems, ...invitationItems].sort(compareForList);
}

function compareForList(a: UserListItem, b: UserListItem): number {
	const aRank = statusRank(a);
	const bRank = statusRank(b);
	if (aRank !== bRank) return aRank - bRank;
	return b.createdAt.getTime() - a.createdAt.getTime();
}

function statusRank(item: UserListItem): number {
	if (item.status === "ACTIVE") return 0;
	if (item.status === "INVITED" && !item.inviteExpired) return 1;
	if (item.status === "INVITED" && item.inviteExpired) return 2;
	return 3;
}
