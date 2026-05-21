import { PrismaNeon } from "@prisma/adapter-neon";
import { seedProposalTemplates } from "../src/features/proposals/seed";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
	throw new Error(
		"DATABASE_URL is not set. Add it to your .env before running this seed.",
	);
}

const systemUserEmail = process.env.INITIAL_ADMIN_EMAIL;
if (!systemUserEmail) {
	throw new Error(
		"INITIAL_ADMIN_EMAIL is not set. Required to attribute the initial template version.",
	);
}

const adapter = new PrismaNeon({ connectionString });
const db = new PrismaClient({ adapter });

async function main() {
	const admin = await db.user.findUnique({
		where: { email: systemUserEmail },
	});
	if (!admin) {
		throw new Error(
			`Admin user with email ${systemUserEmail} not found. Run pnpm db:seed:admin first.`,
		);
	}

	await seedProposalTemplates({ db, systemUserId: admin.id });

	console.log("✓ Proposals seed complete.");
}

main()
	.catch((err) => {
		console.error("Seed failed:", err);
		process.exit(1);
	})
	.finally(async () => {
		await db.$disconnect();
	});
