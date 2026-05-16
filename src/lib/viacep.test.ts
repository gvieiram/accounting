// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("lookupCep", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("returns invalid_format for non-numeric / short input", async () => {
		const { lookupCep } = await import("./viacep");
		const result = await lookupCep("abc");
		expect(result).toEqual({ ok: false, reason: "invalid_format" });
	});

	it("returns invalid_format for partial numeric input", async () => {
		const { lookupCep } = await import("./viacep");
		const result = await lookupCep("1234");
		expect(result).toEqual({ ok: false, reason: "invalid_format" });
	});

	it("returns not_found when ViaCEP responds with erro: true", async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: vi.fn().mockResolvedValue({ erro: true }),
		});
		vi.stubGlobal("fetch", mockFetch);

		const { lookupCep } = await import("./viacep");
		const result = await lookupCep("99999999");
		expect(result).toEqual({ ok: false, reason: "not_found" });
	});

	it("returns upstream_error when fetch responds with non-2xx status", async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 500,
		});
		vi.stubGlobal("fetch", mockFetch);

		const { lookupCep } = await import("./viacep");
		const result = await lookupCep("01001000");
		expect(result).toEqual({ ok: false, reason: "upstream_error" });
	});

	it("returns timeout when fetch throws a TimeoutError", async () => {
		const timeoutError = new Error("The operation was aborted due to timeout");
		timeoutError.name = "TimeoutError";
		const mockFetch = vi.fn().mockRejectedValue(timeoutError);
		vi.stubGlobal("fetch", mockFetch);

		const { lookupCep } = await import("./viacep");
		const result = await lookupCep("01001000");
		expect(result).toEqual({ ok: false, reason: "timeout" });
	});

	it("returns ok with mapped fields for a valid CEP", async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: vi.fn().mockResolvedValue({
				cep: "01001-000",
				logradouro: "Praça da Sé",
				bairro: "Sé",
				localidade: "São Paulo",
				uf: "SP",
			}),
		});
		vi.stubGlobal("fetch", mockFetch);

		const { lookupCep } = await import("./viacep");
		const result = await lookupCep("01001000");
		expect(result).toEqual({
			ok: true,
			data: {
				cep: "01001000",
				street: "Praça da Sé",
				neighborhood: "Sé",
				city: "São Paulo",
				state: "SP",
			},
		});
	});

	it("strips non-numeric chars from rawCep before validating", async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: vi.fn().mockResolvedValue({
				cep: "01001-000",
				logradouro: "Praça da Sé",
				bairro: "Sé",
				localidade: "São Paulo",
				uf: "SP",
			}),
		});
		vi.stubGlobal("fetch", mockFetch);

		const { lookupCep } = await import("./viacep");
		const result = await lookupCep("01001-000");
		expect(result).toMatchObject({ ok: true });
		expect(mockFetch).toHaveBeenCalledWith(
			"https://viacep.com.br/ws/01001000/json/",
			expect.any(Object),
		);
	});
});
