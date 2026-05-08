"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { acceptInvitationAction } from "@/features/users/actions";

type Props = {
	token: string;
	email: string;
	name: string | null;
};

export function InviteAcceptCard({ token, email, name }: Props) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	function handleAccept() {
		startTransition(async () => {
			const result = await acceptInvitationAction({ token });
			if (result.success) {
				toast.success("Convite aceito! Acesse com seu e-mail.", {
					id: "invite-accepted",
				});
				router.push("/login?next=/admin");
			} else {
				toast.error(result.error, { id: "invite-error" });
			}
		});
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Aceitar convite</CardTitle>
				<CardDescription>
					Você foi convidado para administrar o painel da DuoHub.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-2 text-sm">
				<p>
					<span className="text-muted-foreground">E-mail: </span>
					<span className="font-medium">{email}</span>
				</p>
				{name ? (
					<p>
						<span className="text-muted-foreground">Nome: </span>
						<span className="font-medium">{name}</span>
					</p>
				) : null}
				<p className="text-muted-foreground">
					Ao aceitar, sua conta será criada com acesso de administrador. Você
					poderá entrar a qualquer momento usando o link mágico em{" "}
					<span className="font-medium">/login</span>.
				</p>
			</CardContent>
			<CardFooter className="flex flex-col gap-2">
				<Button
					type="button"
					className="w-full"
					onClick={handleAccept}
					disabled={isPending}
				>
					{isPending ? "Aceitando…" : "Aceitar convite"}
				</Button>
			</CardFooter>
		</Card>
	);
}
