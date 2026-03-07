# Feature Sections (Zig-Zag) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implementar 3 seções alternadas (zig-zag) na landing page cobrindo serviços, diferenciais e benefícios da Effer Contabilidade.

**Architecture:** Componente reutilizável `FeatureSection` com prop `reversed` para alternar layout. As 3 seções são instâncias desse componente com dados diferentes. Imagens via `next/image` apontando para `/1.png`, `/2.png`, `/3.png`.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, tw-animate-css, next/image, Lucide React (CheckIcon, ArrowRightIcon)

---

### Task 1: Criar componente FeatureSection

**Files:**
- Create: `src/components/ui/feature-section.tsx`

**Step 1: Criar o componente base**

```tsx
import { CheckIcon } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Bullet = {
	text: string;
};

type FeatureSectionCta = {
	label: string;
	href: string;
	variant?: "default" | "secondary" | "outline";
};

type FeatureSectionProps = {
	badge: string;
	title: string;
	description: string;
	bullets: Bullet[];
	image: {
		src: string;
		alt: string;
	};
	cta: FeatureSectionCta;
	reversed?: boolean;
};

export function FeatureSection({
	badge,
	title,
	description,
	bullets,
	image,
	cta,
	reversed = false,
}: FeatureSectionProps) {
	return (
		<section className="mx-auto w-full max-w-5xl px-4 py-16 md:py-24">
			<div
				className={cn(
					"grid items-center gap-8 md:grid-cols-2 md:gap-12",
					reversed && "md:[&>:first-child]:order-2",
				)}
			>
				<div className="overflow-hidden rounded-xl">
					<Image
						src={image.src}
						alt={image.alt}
						width={600}
						height={450}
						className="size-full object-cover"
					/>
				</div>

				<div className="flex flex-col gap-5">
					<span className="w-fit rounded-full border bg-card px-3 py-1 font-medium text-muted-foreground text-xs">
						{badge}
					</span>

					<h2 className="font-heading text-3xl tracking-tight md:text-4xl">
						{title}
					</h2>

					<p className="text-foreground/80 text-base leading-relaxed md:text-lg">
						{description}
					</p>

					<ul className="grid gap-3">
						{bullets.map((bullet) => (
							<li key={bullet.text} className="flex items-start gap-3">
								<span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-highlight/15">
									<CheckIcon className="size-3 text-highlight" />
								</span>
								<span className="text-foreground/80 text-sm md:text-base">
									{bullet.text}
								</span>
							</li>
						))}
					</ul>

					<div className="pt-2">
						<Button variant={cta.variant ?? "default"} asChild>
							<a href={cta.href}>{cta.label}</a>
						</Button>
					</div>
				</div>
			</div>
		</section>
	);
}
```

**Step 2: Verificar que não há erros de lint**

Run: `pnpm biome check src/components/ui/feature-section.tsx`
Expected: Sem erros

**Step 3: Commit**

```bash
git add src/components/ui/feature-section.tsx
git commit -m "feat: add reusable FeatureSection component"
```

---

### Task 2: Integrar as 3 seções na home page

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Adicionar as 3 seções com dados**

Substituir o conteúdo de `page.tsx` por:

```tsx
import { ArrowRightIcon } from "lucide-react";
import { FeatureSection } from "@/components/ui/feature-section";
import { HeroSection, LogosSection } from "@/components/ui/hero";

export default function Home() {
	return (
		<div className="flex w-full flex-col">
			<main className="grow">
				<HeroSection />
				<LogosSection />

				<FeatureSection
					badge="Nossos serviços"
					title="Serviços contábeis completos para o seu negócio"
					description="A Effer cuida de toda a gestão contábil da sua empresa, desde a escrituração até o planejamento tributário, para que você foque no crescimento do seu negócio."
					bullets={[
						{ text: "Gestão fiscal e tributária" },
						{ text: "Escrituração contábil" },
						{ text: "Abertura e regularização de empresas" },
						{ text: "Folha de pagamento e DP" },
					]}
					image={{
						src: "/1.png",
						alt: "Equipe de contadores trabalhando em escritório moderno",
					}}
					cta={{
						label: "Conheça nossos serviços",
						href: "#servicos",
					}}
				/>

				<FeatureSection
					reversed
					badge="Por que nos escolher"
					title="Tecnologia e proximidade em cada detalhe"
					description="Combinamos uma plataforma digital moderna com atendimento humano e próximo. Você acompanha tudo online e conta com especialistas sempre disponíveis."
					bullets={[
						{ text: "Plataforma 100% digital — acompanhe tudo online" },
						{ text: "Atendimento personalizado com especialistas" },
						{ text: "Processos ágeis e sem burocracia" },
					]}
					image={{
						src: "/2.png",
						alt: "Consultora apresentando painel digital para cliente",
					}}
					cta={{
						label: "Fale com um especialista",
						href: "#contato",
						variant: "secondary",
					}}
				/>

				<FeatureSection
					badge="Resultados reais"
					title="Foque no que importa, a gente cuida do resto"
					description="Deixe a burocracia contábil com quem entende. Liberamos seu tempo para que você possa se dedicar ao que realmente faz o seu negócio crescer."
					bullets={[
						{ text: "Economia de tempo — sem dor de cabeça com burocracia" },
						{ text: "Conformidade garantida — sempre em dia com o fisco" },
						{
							text: "Decisões estratégicas baseadas em dados financeiros claros",
						},
					]}
					image={{
						src: "/3.png",
						alt: "Empreendedor trabalhando tranquilamente em cafeteria",
					}}
					cta={{
						label: "Começar agora",
						href: "#comecar",
					}}
				/>
			</main>
		</div>
	);
}
```

**Step 2: Verificar que não há erros de lint**

Run: `pnpm biome check src/app/page.tsx`
Expected: Sem erros

**Step 3: Verificar dev server renderiza corretamente**

Run: `pnpm dev`
Abrir: http://localhost:3000
Expected: Hero + Logos + 3 seções zig-zag com imagens

**Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add zig-zag feature sections to landing page"
```
