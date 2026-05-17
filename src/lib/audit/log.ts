import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { AuditAction } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { extractRequestContext } from "./extract-request-context";

export type AuditWriteInput = {
	action: AuditAction;
	actorId?: string | null;
	actorEmail?: string | null;
	resourceType?: string;
	resourceId?: string;
	metadata?: Record<string, unknown>;
	headers?: Headers;
	request?: Request;
	ipAddress?: string | null;
	userAgent?: string | null;
};

async function write(input: AuditWriteInput): Promise<void> {
	const fromSource = extractRequestContext(input.headers ?? input.request);
	const ipAddress = input.ipAddress ?? fromSource.ipAddress;
	const userAgent = input.userAgent ?? fromSource.userAgent;

	try {
		await db.auditLog.create({
			data: {
				action: input.action,
				actorId: input.actorId ?? null,
				actorEmail: input.actorEmail ?? null,
				resourceType: input.resourceType,
				resourceId: input.resourceId,
				metadata: input.metadata as Prisma.InputJsonValue,
				ipAddress,
				userAgent,
			},
		});
	} catch (error) {
		const errorName =
			error instanceof Error ? error.constructor.name : "Unknown";
		const errorCode =
			error && typeof error === "object" && "code" in error
				? String((error as { code: unknown }).code)
				: undefined;
		console.error(
			`[audit] failed to write ${input.action}: ${errorName}${
				errorCode ? ` (${errorCode})` : ""
			}`,
		);
	}
}

/**
 * Write an audit log entry for sensitive operations.
 *
 * Best-effort: never throws. If the database write fails, the error is logged
 * to `console.error` and the calling action proceeds normally. This trade-off
 * is intentional — losing an occasional audit row beats failing user-visible
 * actions because of a transient audit issue.
 *
 * Use `request` to capture IP + User-Agent (typically the `Request` argument
 * from a Server Action or route handler).
 */
export const auditLog = { write };
