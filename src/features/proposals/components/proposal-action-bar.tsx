"use client";

// TODO(Task 18): Replace this stub with the real publish dialog + action bar.
// This placeholder exists so Task 17 can land in a compilable state.

import { Button } from "@/components/ui/button";
import type { ProposalStatus } from "@/generated/prisma/enums";

export function ProposalActionBar(_props: {
	proposalId: string;
	status: ProposalStatus;
	category: "CONTINUOUS" | "ONE_OFF";
	versionsCount: number;
}) {
	return (
		<Button type="button" variant="outline" disabled>
			Ações (em breve)
		</Button>
	);
}
