import { PrismaNeon } from "@prisma/adapter-neon";

import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
	throw new Error(
		"DATABASE_URL is not set. Add it to your .env before running this seed.",
	);
}

const adapter = new PrismaNeon({ connectionString });
const db = new PrismaClient({ adapter });

async function main() {
	const email = process.env.INITIAL_ADMIN_EMAIL;
	const name = process.env.INITIAL_ADMIN_NAME ?? "Admin";

	if (!email) {
		throw new Error(
			"INITIAL_ADMIN_EMAIL is not set. Add it to your .env before running this seed.",
		);
	}

	const existing = await db.user.findUnique({ where: { email } });
	if (existing) {
		console.log(`✓ Admin ${email} already exists. Skipping.`);
		return;
	}

	const user = await db.user.create({
		data: {
			email,
			name,
			role: "ADMIN",
			emailVerified: true,
		},
		select: { id: true, email: true },
	});

	console.log(`✓ Created initial admin: ${user.email} (${user.id})`);
	console.log(`→ Visit /login and request a magic link to sign in.`);
}

main()
	.catch((err) => {
		console.error("✗ Seed failed:", err);
		process.exit(1);
	})
	.finally(async () => {
		await db.$disconnect();
	});
