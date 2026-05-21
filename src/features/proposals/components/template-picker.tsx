"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

type Template = {
	key: string;
	name: string;
	category: "CONTINUOUS" | "ONE_OFF";
};

export function TemplatePicker({
	templates,
	value,
	onChange,
}: {
	templates: Template[];
	value: string | null;
	onChange: (key: string) => void;
}) {
	return (
		<div className="grid gap-3 md:grid-cols-2">
			{templates.map((t) => (
				<button
					type="button"
					key={t.key}
					onClick={() => onChange(t.key)}
					className={`text-left ${value === t.key ? "ring-2 ring-primary" : ""}`}
				>
					<Card>
						<CardHeader className="font-semibold">{t.name}</CardHeader>
						<CardContent className="text-muted-foreground text-sm">
							{t.category === "CONTINUOUS"
								? "Serviço contínuo"
								: "Serviço pontual"}
						</CardContent>
					</Card>
				</button>
			))}
		</div>
	);
}
