import { AboutSection } from "@/components/about-section";
import { CtaSection } from "@/components/cta-section";
import { FaqSection } from "@/components/faq-section";
import { StackedFeatures } from "@/components/feature-section";
import { Footer } from "@/components/footer";
import { HeroSection } from "@/components/hero";
import { JsonLd } from "@/components/json-ld";
import type { SocialProofVariant } from "@/components/social-proof-section";
import { SocialProofSection } from "@/components/social-proof-section";
import { messages } from "@/content/messages";
import { socialProofType } from "@/lib/flags";
import { getFaqSchema } from "@/lib/structured-data";

const features = messages.home.features;

export default async function Home() {
	const variant = (await socialProofType()) as SocialProofVariant;

	return (
		<div className="flex w-full flex-col">
			<JsonLd data={getFaqSchema()} />
			<main className="grow">
				<HeroSection />
				<SocialProofSection variant={variant} />
				<StackedFeatures features={features} />
				<AboutSection />
				<FaqSection />
				<CtaSection />
			</main>
			<Footer />
		</div>
	);
}
