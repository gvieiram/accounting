import createWithVercelToolbar from "@vercel/toolbar/plugins/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "images.unsplash.com",
			},
		],
	},
	allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
};

const withVercelToolbar = createWithVercelToolbar();
export default withVercelToolbar(nextConfig);
