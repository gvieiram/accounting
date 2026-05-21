import { describe, expect, it } from "vitest";
import { formatExpirationBR, isExpired, toEndOfSaoPauloDay } from "./tz";

describe("toEndOfSaoPauloDay", () => {
	it("returns end of the selected São Paulo calendar day", () => {
		const eod = toEndOfSaoPauloDay("2026-06-15");
		expect(eod.toISOString()).toBe("2026-06-16T02:59:59.999Z");
	});
});

describe("isExpired", () => {
	it("uses <= so the exact expiration instant is already expired", () => {
		const now = new Date("2026-06-16T02:59:59.999Z");
		expect(isExpired(now, now)).toBe(true);
	});
});

describe("formatExpirationBR", () => {
	it("formats the stored UTC instant as São Paulo date", () => {
		expect(formatExpirationBR(new Date("2026-06-16T02:59:59.999Z"))).toBe(
			"15/06/2026",
		);
	});
});
