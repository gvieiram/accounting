import type { FAQPage, LocalBusiness, WebSite, WithContext } from "schema-dts";
import { company } from "@/content/company";
import { messages } from "@/content/messages";

export function getWebSiteSchema(): WithContext<WebSite> {
	return {
		"@context": "https://schema.org",
		"@type": "WebSite",
		name: company.brand.name,
		url: company.siteUrl,
		description: messages.home.metadata.description,
		inLanguage: "pt-BR",
	};
}

export function getLocalBusinessSchema(): WithContext<LocalBusiness> {
	return {
		"@context": "https://schema.org",
		"@type": "LocalBusiness",
		"@id": `${company.siteUrl}/#organization`,
		name: company.brand.name,
		url: company.siteUrl,
		telephone: company.contacts.phone,
		description: messages.home.metadata.description,
		address: {
			"@type": "PostalAddress",
			addressLocality: company.location.city,
			addressRegion: company.location.state,
			addressCountry: company.location.country,
		},
		sameAs: [company.social.instagram],
		image: `${company.siteUrl}/logos/Full_Logo.png`,
		priceRange: "$$",
		areaServed: {
			"@type": "Country",
			name: "Brasil",
		},
	};
}

export function getFaqSchema(): WithContext<FAQPage> {
	return {
		"@context": "https://schema.org",
		"@type": "FAQPage",
		mainEntity: messages.home.faq.items.map((item) => ({
			"@type": "Question" as const,
			name: item.question,
			acceptedAnswer: {
				"@type": "Answer" as const,
				text: item.answer,
			},
		})),
	};
}
