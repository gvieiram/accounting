import { createFlagsDiscoveryEndpoint, getProviderData } from "flags/next";
import { allFlags } from "@/lib/flags";

export const GET = createFlagsDiscoveryEndpoint(async () => {
	return getProviderData(allFlags);
});
