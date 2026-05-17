import { Heading, Link, Section, Text } from "@react-email/components";
import { EmailButton } from "../_components/email-button";
import { EmailLayout } from "../_components/email-layout";

type Props = {
	magicLinkUrl: string;
	recipientName?: string | null;
};

export function MagicLinkEmail({ magicLinkUrl, recipientName }: Props) {
	const firstName = recipientName?.split(" ")[0];
	const greeting = firstName ? `Olá, ${firstName}!` : "Olá!";

	return (
		<EmailLayout preview="Seu link de acesso ao DuoHub — expira em 15 minutos">
			<Heading as="h1" className="m-0 mb-4 font-28 font-sans text-fg">
				{greeting}
			</Heading>

			<Text className="mx-auto mt-0 mb-8 max-w-[440px] text-center font-16 font-sans text-fg-2">
				Use o botão abaixo para acessar o painel da DuoHub. O link expira em{" "}
				<strong>15 minutos</strong>.
			</Text>

			<Section className="mb-10 text-center">
				<EmailButton href={magicLinkUrl}>Entrar no DuoHub</EmailButton>
			</Section>

			<Text className="mx-auto mt-8 mb-4 max-w-[440px] text-center font-13 font-sans text-fg-3">
				Se você não solicitou este link, pode ignorar este email com segurança.
			</Text>

			<Text className="mx-auto mt-0 mb-0 max-w-[440px] break-all text-center font-11 font-sans text-fg-3">
				Se o botão não funcionar, abra este link no navegador:
				<br />
				<Link
					href={magicLinkUrl}
					className="font-11 font-sans text-fg-3 underline"
				>
					{magicLinkUrl}
				</Link>
			</Text>
		</EmailLayout>
	);
}

MagicLinkEmail.PreviewProps = {
	magicLinkUrl:
		"https://duohubcontabil.com.br/api/auth/magic-link/verify?token=preview-token-abc-123",
	recipientName: "Gustavo Vieira",
} satisfies Props;

export default MagicLinkEmail;
