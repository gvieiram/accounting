// @vitest-environment node

import { describe, expect, it } from "vitest";
import { sleepRandomMs, withMinElapsed } from "./anti-timing";

describe("sleepRandomMs", () => {
	it("sleeps for at least min ms", async () => {
		const start = Date.now();
		await sleepRandomMs(50, 60);
		const elapsed = Date.now() - start;
		expect(elapsed).toBeGreaterThanOrEqual(45);
	});

	it("never sleeps more than max ms (with 20ms tolerance)", async () => {
		const start = Date.now();
		await sleepRandomMs(10, 30);
		const elapsed = Date.now() - start;
		expect(elapsed).toBeLessThanOrEqual(50);
	});

	it("throws if min > max", async () => {
		await expect(sleepRandomMs(100, 50)).rejects.toThrow(/min/);
	});
});

describe("withMinElapsed", () => {
	it("returns the inner promise's value", async () => {
		const result = await withMinElapsed(Promise.resolve(42), 10);
		expect(result).toBe(42);
	});

	it("floors total elapsed time at minMs even for instant work", async () => {
		const start = Date.now();
		await withMinElapsed(Promise.resolve("done"), 60);
		const elapsed = Date.now() - start;
		expect(elapsed).toBeGreaterThanOrEqual(55);
	});

	it("does not extend beyond a slow inner promise", async () => {
		const start = Date.now();
		await withMinElapsed(new Promise((resolve) => setTimeout(resolve, 80)), 20);
		const elapsed = Date.now() - start;
		expect(elapsed).toBeGreaterThanOrEqual(75);
		expect(elapsed).toBeLessThan(150);
	});

	it("propagates rejection from the inner promise", async () => {
		await expect(
			withMinElapsed(Promise.reject(new Error("boom")), 10),
		).rejects.toThrow("boom");
	});
});
