import type { Metadata } from "next";
import {
	Inter,
	JetBrains_Mono,
	Marcellus,
	Playfair_Display,
	Plus_Jakarta_Sans,
} from "next/font/google";
import { Banner } from "@/components/banner";
import { Providers } from "@/components/providers";
import "./globals.css";
import { LandmarkIcon } from "lucide-react";
import { Header } from "@/components/header";
import { company } from "@/content/company";
import { messages } from "@/content/messages";

const plusJakartaSans = Plus_Jakarta_Sans({
	variable: "--font-plus-jakarta",
	subsets: ["latin"],
});

const marcellus = Marcellus({
	variable: "--font-marcellus",
	subsets: ["latin"],
	weight: ["400"],
});

const jetbrainsMono = JetBrains_Mono({
	variable: "--font-jetbrains-mono",
	subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
	variable: "--font-playfair",
	subsets: ["latin"],
});

const inter = Inter({
	variable: "--font-inter",
	subsets: ["latin"],
	weight: ["500"],
});

const siteMetadata = messages.home.metadata;

export const metadata: Metadata = {
	title: siteMetadata.title,
	description: siteMetadata.description,
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="pt-BR" suppressHydrationWarning>
			<body
				suppressHydrationWarning
				className={`${plusJakartaSans.variable} ${marcellus.variable} ${jetbrainsMono.variable} ${playfairDisplay.variable} ${inter.variable} antialiased`}
			>
				<Providers>
					<Header />
					{children}
					<Banner
						icon={<LandmarkIcon />}
						title={messages.home.banner.title}
						description={messages.home.banner.description}
						storageKey={messages.home.banner.storageKey}
						dismissLabel={messages.common.a11y.closeBanner}
						cta={{
							label: messages.home.banner.cta.label,
							href: company.links.whatsappUrl(
								messages.home.banner.cta.whatsappText,
							),
							external: true,
						}}
						position="bottom"
					/>
				</Providers>
			</body>
		</html>
	);
}
