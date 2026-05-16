import "server-only";

export type ViaCepResult =
	| {
			ok: true;
			data: {
				cep: string;
				street: string;
				neighborhood: string;
				city: string;
				state: string;
			};
	  }
	| {
			ok: false;
			reason: "invalid_format" | "not_found" | "timeout" | "upstream_error";
	  };

const CEP_REGEX = /^\d{8}$/;

export async function lookupCep(rawCep: string): Promise<ViaCepResult> {
	const cep = rawCep.replace(/\D/g, "");
	if (!CEP_REGEX.test(cep)) return { ok: false, reason: "invalid_format" };

	try {
		const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
			signal: AbortSignal.timeout(3000),
			next: { revalidate: 60 * 60 * 24 * 30 },
		});
		if (!res.ok) return { ok: false, reason: "upstream_error" };
		const json = (await res.json()) as {
			erro?: boolean;
			logradouro?: string;
			bairro?: string;
			localidade?: string;
			uf?: string;
			cep?: string;
		};
		if (json.erro) return { ok: false, reason: "not_found" };
		return {
			ok: true,
			data: {
				cep: json.cep?.replace(/\D/g, "") ?? cep,
				street: json.logradouro ?? "",
				neighborhood: json.bairro ?? "",
				city: json.localidade ?? "",
				state: json.uf ?? "",
			},
		};
	} catch (e) {
		const isTimeout = e instanceof Error && e.name === "TimeoutError";
		return { ok: false, reason: isTimeout ? "timeout" : "upstream_error" };
	}
}
