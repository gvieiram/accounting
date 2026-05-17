// @vitest-environment node

// biome-ignore-all lint/style/useNamingConvention: mocked exports mirror SCREAMING_SNAKE_CASE const names

import { beforeEach, describe, expect, it, vi } from "vitest";

const emailSendMock = vi.fn();

vi.mock("@/lib/resend", () => ({
	resend: { emails: { send: emailSendMock } },
	EMAIL_FROM_ADDRESS: "DuoHub Gestão Contábil <contato@duohubcontabil.com.br>",
	EMAIL_REPLY_TO: "contato@duohubcontabil.com.br",
}));

const { sendMagicLinkEmail } = await import("./dispatch");

describe("sendMagicLinkEmail", () => {
	beforeEach(() => {
		emailSendMock.mockReset();
		emailSendMock.mockResolvedValue({ data: { id: "mail_1" }, error: null });
	});

	it("sends with the correct From, To and React component", async () => {
		await sendMagicLinkEmail({
			to: "user@test.com",
			magicLinkUrl:
				"https://duohubcontabil.com.br/api/auth/magic-link/verify?token=abc",
			recipientName: "João",
		});

		expect(emailSendMock).toHaveBeenCalledTimes(1);
		const call = emailSendMock.mock.calls[0]?.[0];
		expect(call?.from).toBe(
			"DuoHub Gestão Contábil <contato@duohubcontabil.com.br>",
		);
		expect(call?.to).toBe("user@test.com");
		expect(call?.subject).toMatch(/DuoHub/i);
		expect(call?.react).toBeDefined();
	});

	it("propagates Resend errors to the caller", async () => {
		emailSendMock.mockResolvedValueOnce({
			data: null,
			error: { name: "RateLimitError", message: "throttled" },
		});

		await expect(
			sendMagicLinkEmail({
				to: "user@test.com",
				magicLinkUrl: "https://example.com",
			}),
		).rejects.toThrow(/throttled|RateLimitError/);
	});

	it("does not include token in the subject line", async () => {
		await sendMagicLinkEmail({
			to: "user@test.com",
			magicLinkUrl: "https://example.com/?token=abc-secret-xyz",
		});

		const call = emailSendMock.mock.calls[0]?.[0];
		expect(call?.subject).not.toContain("abc-secret-xyz");
	});
});
