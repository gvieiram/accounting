import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const partners = [
	{
		name: "Franciele",
		role: "Sócia-fundadora · Contabilidade Estratégica",
		initials: "FR",
		image: "/Franciele.png",
		bio: "Experiência em contabilidade de ponta a ponta: abertura, escrituração, obrigações acessórias e planejamento tributário. Relacionamento próximo com clientes e foco em fidelização de longo prazo.",
	},
	{
		name: "Samantha",
		role: "Sócia · Consultoria Sob Demanda",
		initials: "SA",
		image: "/Samantha.png",
		bio: "Especialista em consultoria contábil sob demanda, inovação digital e soluções escaláveis. Atua em serviços pontuais e delimitados para empresas que buscam agilidade.",
	},
];

export function AboutSection() {
	return (
		<section className="mx-auto w-full max-w-5xl border-t py-20 md:py-32">
			<h2 className="mb-16 text-center font-heading text-3xl tracking-tight md:text-4xl">
				Conheça quem cuida do seu negócio
			</h2>

			<div className="grid gap-12 md:grid-cols-2">
				{partners.map((partner) => (
					<div
						key={partner.initials}
						className="flex flex-col items-center text-center"
					>
						<Avatar className="mb-4 size-24 md:size-32">
							<AvatarImage
								src={partner.image}
								alt={`Foto de ${partner.name}`}
							/>
							<AvatarFallback className="bg-muted">
								{partner.initials}
							</AvatarFallback>
						</Avatar>
						<h3 className="mb-1 font-heading text-2xl">{partner.name}</h3>
						<p className="mb-3 font-medium text-highlight text-sm">
							{partner.role}
						</p>
						<p className="text-muted-foreground text-sm leading-relaxed">
							{partner.bio}
						</p>
					</div>
				))}
			</div>

			<p className="mx-auto mt-16 max-w-2xl text-center text-muted-foreground">
				A Effer combina contabilidade contínua e consultoria sob demanda:
				atendimento recorrente para quem precisa de acompanhamento completo e
				serviços pontuais para quem busca soluções específicas e ágeis.
			</p>
		</section>
	);
}
