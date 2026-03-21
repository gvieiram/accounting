import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { messages } from "@/content/messages";

export function AboutSection() {
	const about = messages.home.about;

	return (
		<section className="mx-auto w-full max-w-5xl border-t py-20 md:py-32">
			<h2 className="mb-16 text-center font-heading text-3xl tracking-tight md:text-4xl">
				{about.title}
			</h2>

			<div className="grid gap-12 md:grid-cols-2">
				{about.partners.map((partner) => (
					<div
						key={partner.initials}
						className="flex flex-col items-center text-center"
					>
						<Avatar className="mb-4 size-24 md:size-32">
							<AvatarImage
								src={partner.image}
								alt={messages.common.a11y.photoOf(partner.name)}
							/>
							<AvatarFallback className="bg-muted">
								{partner.initials}
							</AvatarFallback>
						</Avatar>
						<h3 className="mb-1 font-heading text-2xl">{partner.name}</h3>
						<p className="mb-3 font-medium text-highlight text-sm">
							{partner.role}
						</p>
						<p className="text-muted-foreground text-sm leading-relaxed">
							{partner.bio}
						</p>
					</div>
				))}
			</div>

			<p className="mx-auto mt-16 max-w-2xl text-center text-muted-foreground">
				{about.conclusion}
			</p>
		</section>
	);
}
