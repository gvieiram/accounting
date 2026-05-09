import { Heading, Link, Section, Text } from "@react-email/components";
import { EmailButton } from "../_components/email-button";
import { EmailLayout } from "../_components/email-layout";

type Props = {
	acceptUrl: string;
	recipientName?: string | null;
	inviterName?: string | null;
};

export function InviteEmail({ acceptUrl, recipientName, inviterName }: Props) {
	const firstName = recipientName?.split(" ")[0];
	const greeting = firstName ? `Olá, ${firstName}!` : "Olá!";
	const inviter = inviterName?.split(" ")[0] ?? "a equipe da DuoHub";

	return (
		<EmailLayout preview="Você foi convidado para o painel da DuoHub — aceite em até 24 horas">
			<Heading as="h1" className="m-0 mb-4 font-28 font-sans text-fg">
				{greeting}
			</Heading>

			<Text className="mx-auto mt-0 mb-8 max-w-[440px] text-center font-16 font-sans text-fg-2">
				{inviter} convidou você para administrar o painel da DuoHub. Use o botão
				abaixo para revisar e aceitar o convite. O link expira em{" "}
				<strong>24 horas</strong>.
			</Text>

			<Section className="mb-10 text-center">
				<EmailButton href={acceptUrl}>Aceitar convite</EmailButton>
			</Section>

			<Text className="mx-auto mt-8 mb-4 max-w-[440px] text-center font-13 font-sans text-fg-3">
				Se você não esperava este convite, pode ignorar este email com segurança
				— nada acontece sem a sua confirmação.
			</Text>

			<Text className="mx-auto mt-0 mb-0 max-w-[440px] break-all text-center font-11 font-sans text-fg-3">
				Se o botão não funcionar, abra este link no navegador:
				<br />
				<Link
					href={acceptUrl}
					className="font-11 font-sans text-fg-3 underline"
				>
					{acceptUrl}
				</Link>
			</Text>
		</EmailLayout>
	);
}

InviteEmail.PreviewProps = {
	acceptUrl:
		"https://duohubcontabil.com.br/invite/accept?token=preview-token-abc-123",
	recipientName: "Gustavo Vieira",
	inviterName: "Equipe DuoHub",
} satisfies Props;

export default InviteEmail;
