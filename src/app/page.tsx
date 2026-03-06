"use client";

import { useTheme } from "next-themes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const colorTokens = [
	{ name: "Background", bg: "bg-background", fg: "text-foreground" },
	{ name: "Primary", bg: "bg-primary", fg: "text-primary-foreground" },
	{ name: "Secondary", bg: "bg-secondary", fg: "text-secondary-foreground" },
	{ name: "Accent", bg: "bg-accent", fg: "text-accent-foreground" },
	{
		name: "Highlight",
		bg: "bg-highlight",
		fg: "text-highlight-foreground",
	},
	{ name: "Muted", bg: "bg-muted", fg: "text-muted-foreground" },
	{ name: "Card", bg: "bg-card", fg: "text-card-foreground" },
	{
		name: "Destructive",
		bg: "bg-destructive",
		fg: "text-destructive-foreground",
	},
	{ name: "Success", bg: "bg-success", fg: "text-success-foreground" },
	{ name: "Warning", bg: "bg-warning", fg: "text-warning-foreground" },
	{ name: "Info", bg: "bg-info", fg: "text-info-foreground" },
];

const chartColors = [
	{ name: "Chart 1", bg: "bg-chart-1" },
	{ name: "Chart 2", bg: "bg-chart-2" },
	{ name: "Chart 3", bg: "bg-chart-3" },
	{ name: "Chart 4", bg: "bg-chart-4" },
	{ name: "Chart 5", bg: "bg-chart-5" },
];

const sidebarColors = [
	{ name: "Sidebar", bg: "bg-sidebar", fg: "text-sidebar-foreground" },
	{
		name: "Sidebar Accent",
		bg: "bg-sidebar-accent",
		fg: "text-sidebar-accent-foreground",
	},
	{
		name: "Sidebar Primary",
		bg: "bg-sidebar-primary",
		fg: "text-sidebar-primary-foreground",
	},
];

function ThemeToggle() {
	const { theme, setTheme } = useTheme();

	return (
		<div className="flex items-center gap-3">
			<span className="text-muted-foreground text-sm">Light</span>
			<Switch
				checked={theme === "dark"}
				onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
			/>
			<span className="text-muted-foreground text-sm">Dark</span>
		</div>
	);
}

function Section({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<section className="space-y-4">
			<h2 className="font-heading text-2xl tracking-tight">{title}</h2>
			<Separator />
			{children}
		</section>
	);
}

export default function Home() {
	return (
		<main className="mx-auto max-w-5xl space-y-12 p-8 pb-20">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="font-heading text-4xl text-primary tracking-tight">
						Theme Preview
					</h1>
					<p className="mt-1 text-muted-foreground">
						Paleta baseada no template Minsk — Dark Teal + Terracotta
					</p>
				</div>
				<ThemeToggle />
			</div>

			<Section title="Paleta de Cores">
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
					{colorTokens.map((t) => (
						<div key={t.name} className="space-y-1.5">
							<div
								className={`${t.bg} ${t.fg} flex h-20 items-end rounded-lg border p-3 font-medium text-xs shadow-sm`}
							>
								{t.name}
							</div>
							<p className="text-muted-foreground text-xs">{t.bg}</p>
						</div>
					))}
				</div>
			</Section>

			<Section title="Chart Colors">
				<div className="flex gap-2">
					{chartColors.map((c) => (
						<div key={c.name} className="flex-1 space-y-1.5">
							<div className={`${c.bg} h-12 rounded-lg shadow-sm`} />
							<p className="text-center text-muted-foreground text-xs">
								{c.name}
							</p>
						</div>
					))}
				</div>
			</Section>

			<Section title="Sidebar Colors">
				<div className="flex gap-3">
					{sidebarColors.map((s) => (
						<div key={s.name} className="flex-1 space-y-1.5">
							<div
								className={`${s.bg} ${s.fg} flex h-16 items-center justify-center rounded-lg font-medium text-sm shadow-sm`}
							>
								{s.name}
							</div>
						</div>
					))}
				</div>
			</Section>

			<Section title="Tipografia — Headings (Marcellus)">
				<div className="space-y-3">
					<h1 className="font-heading text-5xl tracking-tight">
						Heading 1 — Marcellus
					</h1>
					<h2 className="font-heading text-4xl tracking-tight">
						Heading 2 — Marcellus
					</h2>
					<h3 className="font-heading text-3xl">Heading 3 — Marcellus</h3>
					<h4 className="font-heading text-2xl">Heading 4 — Marcellus</h4>
					<h5 className="font-heading text-xl">Heading 5 — Marcellus</h5>
					<h6 className="font-heading text-lg">Heading 6 — Marcellus</h6>
				</div>
			</Section>

			<Section title="Tipografia — Body (Plus Jakarta Sans)">
				<div className="max-w-2xl space-y-3">
					<p className="font-semibold text-base">
						Semibold — Serviços contábeis profissionais para o seu negócio.
					</p>
					<p className="font-medium text-base">
						Medium — Planejamento tributário e compliance fiscal.
					</p>
					<p className="text-base leading-relaxed">
						Regular — Lorem ipsum dolor sit amet, consectetur adipiscing elit.
						Suspendisse varius enim in eros elementum tristique. Serviços
						contábeis profissionais para o seu negócio.
					</p>
					<p className="font-light text-base">
						Light — Informações complementares com peso mais leve para
						hierarquia visual.
					</p>
					<p className="text-muted-foreground text-sm">
						Texto muted — Informações secundárias e descrições de apoio que
						complementam o conteúdo principal.
					</p>
					<p className="font-mono text-sm">
						Monospace — JetBrains Mono: const total = 1_250.00
					</p>
				</div>
			</Section>

			<Section title="Heading + Body Combinados">
				<div className="max-w-2xl space-y-4">
					<h2 className="font-heading text-3xl text-primary tracking-tight">
						Consultoria Financeira Estratégica
					</h2>
					<p className="leading-relaxed">
						Nossa equipe de especialistas oferece serviços contábeis
						personalizados para atender às necessidades específicas do seu
						negócio. Com anos de experiência no setor, temos a expertise
						necessária para fornecer as soluções certas.
					</p>
					<p className="text-muted-foreground text-sm">
						Agende uma consulta gratuita e descubra como podemos ajudar.
					</p>
					<Button>Agendar consulta</Button>
				</div>
			</Section>

			<Section title="Botões">
				<div className="space-y-6">
					<div className="flex flex-wrap items-center gap-3">
						<Button>Primary</Button>
						<Button variant="secondary">Secondary</Button>
						<Button variant="outline">Outline</Button>
						<Button variant="ghost">Ghost</Button>
						<Button variant="destructive">Destructive</Button>
						<Button variant="link">Link</Button>
					</div>

					<div className="flex flex-wrap items-center gap-3">
						<Button size="xs">Extra Small</Button>
						<Button size="sm">Small</Button>
						<Button size="default">Default</Button>
						<Button size="lg">Large</Button>
					</div>

					<div className="flex flex-wrap items-center gap-3">
						<Button disabled>Disabled</Button>
						<Button variant="outline" disabled>
							Disabled Outline
						</Button>
					</div>
				</div>
			</Section>

			<Section title="Badges">
				<div className="flex flex-wrap items-center gap-3">
					<Badge>Default</Badge>
					<Badge variant="secondary">Secondary</Badge>
					<Badge variant="outline">Outline</Badge>
					<Badge variant="destructive">Destructive</Badge>
				</div>
			</Section>

			<Section title="Formulários">
				<div className="grid max-w-xl gap-4">
					<div className="space-y-2">
						<label htmlFor="name" className="font-medium text-sm">
							Nome
						</label>
						<Input id="name" placeholder="Digite seu nome..." />
					</div>
					<div className="space-y-2">
						<label htmlFor="email" className="font-medium text-sm">
							Email
						</label>
						<Input id="email" type="email" placeholder="email@exemplo.com" />
					</div>
					<div className="space-y-2">
						<label htmlFor="message" className="font-medium text-sm">
							Mensagem
						</label>
						<Textarea id="message" placeholder="Escreva sua mensagem..." />
					</div>
					<Button className="w-fit">Enviar</Button>
				</div>
			</Section>

			<Section title="Cards">
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					<Card>
						<CardHeader>
							<CardTitle className="font-heading text-xl">
								Contabilidade
							</CardTitle>
							<CardDescription>
								Serviços contábeis completos para empresas de todos os portes.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Button variant="outline" className="w-full">
								Saiba mais
							</Button>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="font-heading text-xl">Impostos</CardTitle>
							<CardDescription>
								Planejamento tributário e compliance fiscal para otimizar seus
								resultados.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Button variant="outline" className="w-full">
								Saiba mais
							</Button>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="font-heading text-xl">
								Consultoria
							</CardTitle>
							<CardDescription>
								Análise financeira e consultoria estratégica para crescimento
								sustentável.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Button variant="outline" className="w-full">
								Saiba mais
							</Button>
						</CardContent>
					</Card>
				</div>
			</Section>

			<Section title="Bordas & Espaçamento">
				<div className="flex flex-wrap items-center gap-4">
					<div className="flex h-16 w-16 items-center justify-center rounded-sm border bg-card text-muted-foreground text-xs">
						sm
					</div>
					<div className="flex h-16 w-16 items-center justify-center rounded-md border bg-card text-muted-foreground text-xs">
						md
					</div>
					<div className="flex h-16 w-16 items-center justify-center rounded-lg border bg-card text-muted-foreground text-xs">
						lg
					</div>
					<div className="flex h-16 w-16 items-center justify-center rounded-xl border bg-card text-muted-foreground text-xs">
						xl
					</div>
					<div className="flex h-16 w-16 items-center justify-center rounded-full border bg-card text-muted-foreground text-xs">
						full
					</div>
				</div>
			</Section>
		</main>
	);
}
