import type { MetadataRoute } from "next";
import { company } from "@/content/company";
import { messages } from "@/content/messages";

// biome-ignore-start lint/style/useNamingConvention: Web App Manifest spec requires snake_case keys
export default function manifest(): MetadataRoute.Manifest {
	return {
		name: company.brand.name,
		short_name: company.brand.displayName,
		description: messages.home.metadata.description,
		start_url: "/",
		display: "standalone",
		background_color: "#0a0a0a",
		theme_color: "#1a5c57",
		icons: [
			{
				src: "/icons/icon-192.png",
				sizes: "192x192",
				type: "image/png",
			},
			{
				src: "/icons/icon-512.png",
				sizes: "512x512",
				type: "image/png",
			},
		],
	};
}
// biome-ignore-end lint/style/useNamingConvention: Web App Manifest spec requires snake_case keys
