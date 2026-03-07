import { HeroSection, LogosSection } from "@/components/ui/hero";

export default function Home() {
	return (
		<div className="flex w-full flex-col">
			<main className="grow">
				<HeroSection />
				<LogosSection />
				<section className="container mx-auto h-screen">
					{/* <h2>Serviços</h2>
					<p>
						Oferecemos uma ampla gama de serviços para atender às necessidades
						de seu negócio.
					</p>
					<ul>
						<li>Contabilidade</li>
						<li>Tributação</li>
						<li>Financeiro</li>
					</ul> */}
				</section>
			</main>
		</div>
	);
}
