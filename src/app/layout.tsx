import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { VercelToolbar } from "@vercel/toolbar/next";

import type { Metadata } from "next";
import {
	Inter,
	JetBrains_Mono,
	Marcellus,
	Playfair_Display,
	Plus_Jakarta_Sans,
} from "next/font/google";
import { Banner } from "@/components/banner";
import { JsonLd } from "@/components/json-ld";
import { Providers } from "@/components/providers";
import "./globals.css";
import { LandmarkIcon } from "lucide-react";
import { Header } from "@/components/header";
import { company } from "@/content/company";
import { messages } from "@/content/messages";
import { resolveAll } from "@/lib/flags";
import {
	getLocalBusinessSchema,
	getWebSiteSchema,
} from "@/lib/structured-data";

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

const { title, description } = messages.home.metadata;

export const metadata: Metadata = {
	metadataBase: new URL(company.siteUrl),
	title,
	description,
	alternates: {
		canonical: "/",
	},
	openGraph: {
		title,
		description,
		url: "/",
		siteName: company.brand.name,
		locale: "pt_BR",
		type: "website",
	},
	twitter: {
		card: "summary_large_image",
		title,
		description,
	},
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			"max-video-preview": -1,
			"max-image-preview": "large",
			"max-snippet": -1,
		},
	},
};

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const shouldInjectToolbar = process.env.NODE_ENV === "development";

	const flagValues = await resolveAll();

	return (
		<html lang="pt-BR" suppressHydrationWarning>
			<head>
				<JsonLd data={getWebSiteSchema()} />
				<JsonLd data={getLocalBusinessSchema()} />
			</head>
			<body
				suppressHydrationWarning
				className={`${plusJakartaSans.variable} ${marcellus.variable} ${jetbrainsMono.variable} ${playfairDisplay.variable} ${inter.variable} antialiased`}
			>
				<Providers flags={flagValues}>
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
				{shouldInjectToolbar && <VercelToolbar />}
				<Analytics />
				<SpeedInsights />
			</body>
		</html>
	);
}
