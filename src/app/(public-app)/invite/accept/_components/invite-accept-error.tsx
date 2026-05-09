import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export type InviteAcceptErrorReason =
	| "missingToken"
	| "invalid"
	| "expired"
	| "accepted"
	| "cancelled";

type Props = {
	reason: InviteAcceptErrorReason;
};

const COPY: Record<
	InviteAcceptErrorReason,
	{ title: string; description: string }
> = {
	missingToken: {
		title: "Convite inválido",
		description: "O link está incompleto. Solicite um novo convite.",
	},
	invalid: {
		title: "Convite inválido",
		description:
			"Este link não corresponde a um convite válido. Solicite um novo convite.",
	},
	expired: {
		title: "Convite expirado",
		description:
			"Este convite passou de 24 horas. Peça ao administrador para reenviar.",
	},
	accepted: {
		title: "Convite já aceito",
		description: "Você já tem acesso. Entre pelo /login com seu e-mail.",
	},
	cancelled: {
		title: "Convite cancelado",
		description:
			"Este convite foi cancelado pelo administrador. Solicite um novo se ainda precisar de acesso.",
	},
};

export function InviteAcceptError({ reason }: Props) {
	const copy = COPY[reason];
	return (
		<Card>
			<CardHeader>
				<CardTitle>{copy.title}</CardTitle>
				<CardDescription>{copy.description}</CardDescription>
			</CardHeader>
			<CardContent />
			<CardFooter>
				<Button asChild variant="outline" className="w-full">
					<Link href="/">Voltar para o início</Link>
				</Button>
			</CardFooter>
		</Card>
	);
}
