"use client";

import {
	BriefcaseBusinessIcon,
	CalendarIcon,
	TrendingUpIcon,
} from "lucide-react";
import { InfiniteSlider } from "@/components/infinite-slider";
import { messages } from "@/content/messages";
import { cn } from "@/lib/utils";

export type SocialProofVariant = "clients" | "credentials" | "statement";

type SocialProofSectionProps = {
	variant?: SocialProofVariant;
};

const credentialIcons = {
	briefcaseBusiness: BriefcaseBusinessIcon,
	calendar: CalendarIcon,
	trendingUp: TrendingUpIcon,
} as const;

function ClientsVariant() {
	const { names, separator } = messages.home.socialProof.clients;

	return (
		<div className="mask-[linear-gradient(to_right,transparent,black,transparent)] overflow-hidden py-4">
			<InfiniteSlider gap={0} reverse duration={50} durationOnHover={25}>
				{names.map((name) => (
					<span
						key={name}
						className="font-(family-name:--font-playfair) flex items-center gap-8 text-lg text-muted-foreground italic tracking-wide md:gap-12 md:text-xl"
					>
						{name}
						<span aria-hidden="true" className="select-none text-border">
							{separator}
						</span>
					</span>
				))}
			</InfiniteSlider>
		</div>
	);
}

function CredentialsVariant() {
	const { items } = messages.home.socialProof.credentials;

	return (
		<div className="flex flex-col items-center justify-center gap-6 py-4 sm:flex-row sm:gap-0">
			{items.map((item, index) => {
				const Icon = credentialIcons[item.icon];
				return (
					<div
						key={item.label}
						className={cn(
							"flex items-center gap-3 px-8",
							index > 0 && "border-border/60 sm:border-l",
						)}
					>
						<Icon className="size-5 shrink-0 text-primary/60" />
						<div className="flex flex-col">
							<span className="font-medium text-foreground/80 text-sm tracking-tight">
								{item.label}
							</span>
							{"description" in item &&
								typeof item.description === "string" && (
									<span className="text-muted-foreground text-xs">
										{item.description}
									</span>
								)}
						</div>
					</div>
				);
			})}
		</div>
	);
}

function StatementVariant() {
	const { quote } = messages.home.socialProof.statement;

	return (
		<div className="flex flex-col items-center gap-4 py-4">
			<div aria-hidden="true" className="h-px w-12 bg-border" />
			<p className="font-(family-name:--font-playfair) max-w-2xl text-center text-muted-foreground text-xl italic tracking-wide md:text-2xl">
				&ldquo;{quote}&rdquo;
			</p>
			<div aria-hidden="true" className="h-px w-12 bg-border" />
		</div>
	);
}

const variants: Record<SocialProofVariant, () => React.ReactNode> = {
	clients: ClientsVariant,
	credentials: CredentialsVariant,
	statement: StatementVariant,
};

const DEFAULT_VARIANT: SocialProofVariant = "credentials";

export function SocialProofSection({
	variant = DEFAULT_VARIANT,
}: SocialProofSectionProps) {
	const safeVariant = variant in variants ? variant : DEFAULT_VARIANT;
	const Variant = variants[safeVariant];
	const title =
		safeVariant === "clients" ? messages.home.socialProof.clients.title : null;

	return (
		<section className="relative space-y-4 border-t pt-6 pb-10">
			{title && (
				<h2 className="text-center font-medium text-lg text-muted-foreground tracking-tight md:text-xl">
					{title}
				</h2>
			)}
			<div className="relative z-10 mx-auto max-w-4xl">
				<Variant />
			</div>
		</section>
	);
}
