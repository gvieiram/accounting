import { Logo } from "@/components/logo";
import { messages } from "@/content/messages";
import { AppLogoutButton } from "./_components/app-logout-button";

export const dynamic = "force-dynamic";

export default function AppHomePage() {
	const copy = messages.app.placeholder;

	return (
		<main className="mx-auto flex min-h-svh max-w-xl flex-col items-center justify-center gap-8 px-6 py-16 text-center">
			<Logo animated={false} />
			<div className="flex flex-col gap-3">
				<span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
					{copy.eyebrow}
				</span>
				<h1 className="font-marcellus text-3xl text-foreground sm:text-4xl">
					{copy.title}
				</h1>
				<p className="text-muted-foreground text-sm sm:text-base">
					{copy.description}
				</p>
			</div>
			<AppLogoutButton />
		</main>
	);
}
