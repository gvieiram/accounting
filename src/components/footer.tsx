import { InstagramIcon } from "lucide-react";
import Link from "next/link";
import { HomeLink } from "@/components/home-link";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { Logo } from "@/components/logo";
import { Separator } from "@/components/ui/separator";
import { company } from "@/content/company";
import { messages } from "@/content/messages";

const links = [
	messages.common.nav.services,
	messages.common.nav.about,
	messages.common.nav.contact,
];

const socialLinks = [
	{
		label: "Instagram",
		href: company.social.instagram,
		icon: InstagramIcon,
	},
	{
		label: "WhatsApp",
		href: company.links.whatsappUrl(messages.home.cta.whatsappText),
		icon: WhatsAppIcon,
	},
];

export function Footer() {
	return (
		<footer className="w-full border-t">
			<div className="mx-auto w-full max-w-5xl px-4 py-8">
				<div className="flex flex-col items-center gap-6 md:flex-row md:items-center md:justify-between">
					<HomeLink aria-label={messages.home.footer.ariaLabelHome}>
						<Logo size="lg" animated={false} />
					</HomeLink>
					<nav
						className="flex flex-wrap justify-center gap-x-6 gap-y-2"
						aria-label={messages.common.a11y.footerNav}
					>
						{links.map((link) => (
							<Link
								key={link.href}
								href={link.href}
								className="text-muted-foreground text-sm transition-colors hover:text-foreground"
							>
								{link.label}
							</Link>
						))}
					</nav>
					<div className="flex items-center gap-4">
						{socialLinks.map(({ label, href, icon: Icon }) => (
							<a
								key={label}
								href={href}
								className="text-muted-foreground transition-colors hover:text-foreground"
								aria-label={label}
							>
								<Icon className="size-5" />
							</a>
						))}
					</div>
				</div>
				<Separator className="my-6" />
				<div className="flex flex-col items-center gap-1 text-center text-sm">
					<p className="text-muted-foreground">
						{messages.home.footer.copyright}
					</p>
					<p className="text-muted-foreground/60">
						{messages.home.footer.developedBy}
					</p>
				</div>
			</div>
		</footer>
	);
}
