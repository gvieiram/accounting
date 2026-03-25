import { flag } from "flags/next";

type FlagInput = Parameters<typeof flag>[0];
type StrictFlagInput<V> = Omit<FlagInput, "defaultValue"> & {
	defaultValue: V;
};

export function defineFlag<V = boolean>(definition: StrictFlagInput<V>) {
	// biome-ignore lint/suspicious/noExplicitAny: type safety enforced by StrictFlagInput<V>
	return flag<V>(definition as any);
}
