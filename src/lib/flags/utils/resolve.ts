import { allFlags } from "../flags";

export type FlagsState = {
	[K in keyof typeof allFlags]: Awaited<ReturnType<(typeof allFlags)[K]>>;
};

export async function resolveAll(): Promise<FlagsState> {
	const entries = await Promise.all(
		Object.entries(allFlags).map(async ([key, fn]) => [key, await fn()]),
	);
	return Object.fromEntries(entries) as FlagsState;
}
