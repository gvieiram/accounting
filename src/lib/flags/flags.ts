import { vercelAdapter } from "@flags-sdk/vercel";
import { defineFlag } from "./utils/define-flag";

export const logoTextCentered = defineFlag({
	key: "logo-text-centered",
	defaultValue: false,
	adapter: vercelAdapter(),
});

export const allFlags = { isLogoTextCentered: logoTextCentered };
