export type UserListStatus = "ACTIVE" | "INVITED" | "REVOKED";

export type UserListItem = {
	id: string;
	kind: "user" | "invitation";
	email: string;
	name: string | null;
	createdAt: Date;
	status: UserListStatus;
	lastAccessAt: Date | null;
	expiresAt: Date | null;
	inviteExpired: boolean;
};
