import type { MetadataRoute } from "next";
import { company } from "@/content/company";

export default function sitemap(): MetadataRoute.Sitemap {
	return [
		{
			url: company.siteUrl,
			lastModified: new Date(),
			changeFrequency: "weekly",
			priority: 1,
		},
	];
}
