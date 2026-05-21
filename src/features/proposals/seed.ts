import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import { allTemplates } from "./templates";

/**
 * Upserts ProposalTemplate rows and creates initial v1 ProposalTemplateVersion
 * for templates that don't have a version yet. Idempotent.
 */
export async function seedProposalTemplates(opts: {
	db: PrismaClient;
	systemUserId: string;
}): Promise<void> {
	const { db, systemUserId } = opts;

	for (const t of allTemplates) {
		const template = await db.proposalTemplate.upsert({
			where: { key: t.key },
			update: { name: t.name, category: t.category },
			create: {
				key: t.key,
				name: t.name,
				category: t.category,
				isActive: true,
			},
		});

		const existing = await db.proposalTemplateVersion.findFirst({
			where: { templateId: template.id },
			orderBy: { version: "desc" },
		});

		if (existing) {
			if (!template.currentVersionId) {
				await db.proposalTemplate.update({
					where: { id: template.id },
					data: { currentVersionId: existing.id },
				});
				console.log(
					`✓ Template ${t.key} had orphan version ${existing.version}, repaired currentVersionId.`,
				);
			} else {
				console.log(
					`✓ Template ${t.key} already has version ${existing.version}. Skipping.`,
				);
			}
			continue;
		}

		const fieldsSchema = z.toJSONSchema(t.schema);

		await db.$transaction(async (tx) => {
			const version = await tx.proposalTemplateVersion.create({
				data: {
					templateId: template.id,
					version: 1,
					fieldsSchema: fieldsSchema as object,
					defaultContent: t.defaultContent as object,
					createdById: systemUserId,
				},
			});

			await tx.proposalTemplate.update({
				where: { id: template.id },
				data: { currentVersionId: version.id },
			});
		});

		console.log(`✓ Seeded template ${t.key} with version 1.`);
	}
}
