import type { Metadata } from "next";
import { JetBrains_Mono, Marcellus, Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import { Banner } from "@/components/ui/banner";
import "./globals.css";
import { LandmarkIcon } from "lucide-react";
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
					<Banner
						icon={<LandmarkIcon />}
						title="Imposto de Renda 2026"
						description="Prazo até 30 de maio. Não deixe para a última hora!"
						storageKey="ir-2026"
						cta={{
							label: "Declarar agora",
							href: "https://wa.me/5511999999999?text=Olá! Gostaria de saber sobre a declaração do IR 2026",
							external: true,
						}}
						position="bottom"
					/>
				</Providers>
			</body>
		</html>
	);
}
