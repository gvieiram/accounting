import type { Metadata } from "next";
import { JetBrains_Mono, Marcellus, Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";
import { Header } from "@/components/ui/header";

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

export const metadata: Metadata = {
	title: "Accounting",
	description: "Professional accounting services",
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
				className={`${plusJakartaSans.variable} ${marcellus.variable} ${jetbrainsMono.variable} antialiased`}
			>
				<Providers>
					<Header />
					{children}
				</Providers>
			</body>
		</html>
	);
}
