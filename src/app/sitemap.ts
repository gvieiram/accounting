import type { MetadataRoute } from "next";
import { company } from "@/content/company";

export default function sitemap(): MetadataRoute.Sitemap {
	const base = company.siteUrl;
	const lastModified = new Date();

	return [
		{
			url: `${base}/`,
			lastModified,
			changeFrequency: "weekly",
			priority: 1,
		},
	];
}
