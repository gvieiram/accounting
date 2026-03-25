const whatsappNumber = "5511999999999";

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
	contacts: {
		whatsappNumber,
	},
	social: {
		instagram: "#",
	},
	links: {
		whatsappUrl,
	},
} as const;
