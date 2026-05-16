import "server-only";

export async function sleepRandomMs(min: number, max: number): Promise<void> {
	if (min > max) {
		throw new Error(`sleepRandomMs: min (${min}) must be <= max (${max})`);
	}
	const ms = Math.floor(min + Math.random() * (max - min));
	await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * Resolves `promise` but never returns earlier than `minMs` after the call.
 *
 * Defence-in-depth against existence-enumeration timing attacks: the inner
 * work (DB lookup, email dispatch, hash compare) varies with the input and
 * its branches, so callers wrapping the entire flow in `withMinElapsed`
 * collapse those branches into a single observable wall-clock duration
 * (floored at `minMs`). Picks an `minMs` above the P90 of the slow branch
 * so the fast branch can't be distinguished.
 */
export async function withMinElapsed<T>(
	promise: Promise<T>,
	minMs: number,
): Promise<T> {
	const floor = new Promise<void>((resolve) => setTimeout(resolve, minMs));
	const [result] = await Promise.all([promise, floor]);
	return result;
}
