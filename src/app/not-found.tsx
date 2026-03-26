import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { messages } from "@/content/messages";

const content = messages.notFound;

export default function NotFound() {
	return (
		<main className="flex min-h-[calc(100svh-3.5rem)] flex-col items-center justify-center px-4">
			<div className="flex flex-col items-center gap-6 text-center">
				<p className="font-heading text-8xl text-primary tracking-tighter">
					{content.statusCode}
				</p>
				<div className="flex flex-col gap-2">
					<h1 className="font-heading text-2xl tracking-tight md:text-3xl">
						{content.heading}
					</h1>
					<p className="max-w-md text-muted-foreground">
						{content.description}
					</p>
				</div>
				<Button asChild variant="outline" className="mt-2">
					<Link href="/">
						<ArrowLeftIcon className="size-4" />
						{content.backToHome}
					</Link>
				</Button>
			</div>
		</main>
	);
}
