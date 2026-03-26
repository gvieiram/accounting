const whatsappNumber = "5548992467107";
const instagramUserName = "duohubcontabil";
const siteUrl = "https://duohubcontabil.com.br";

function whatsappUrl(text: string) {
	return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;
}

export const company = {
	brand: {
		name: "DuoHub Gestão Contábil",
		displayName: "DuoHub",
		displayNameProps: {
			duo: "Duo",
			hub: "Hub",
		},
		subtitle: "Gestão Contábil",
	},
	siteUrl,
	contacts: {
		whatsappNumber,
		phone: "+55 48 99246-7107",
	},
	location: {
		city: "Florianópolis",
		state: "SC",
		country: "BR",
	},
	social: {
		instagramUserName,
		instagram: `https://www.instagram.com/${instagramUserName}/`,
	},
	links: {
		whatsappUrl,
	},
} as const;
