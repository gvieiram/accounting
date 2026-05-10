import { ClientType } from "@/generated/prisma/enums";
import { AUDIT_DIFF_FIELD_TRUNCATE } from "./constants";

// ---------------------------------------------------------------------------
// Document helpers
// ---------------------------------------------------------------------------

export function stripDocument(value: string): string {
	return value.replace(/\D/g, "");
}

export function formatCpf(value: string): string {
	const d = stripDocument(value);
	if (d.length !== 11) return value;
	return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function formatCnpj(value: string): string {
	const d = stripDocument(value);
	if (d.length !== 14) return value;
	return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function formatDocument(type: ClientType, value: string): string {
	if (type === ClientType.PF) return formatCpf(value);
	return formatCnpj(value);
}

export function formatCep(value: string): string {
	const d = stripDocument(value);
	if (d.length !== 8) return value;
	return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export function formatPhoneBR(value: string): string {
	const d = stripDocument(value);
	if (d.length === 10)
		return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
	if (d.length === 11)
		return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
	return value;
}

// ---------------------------------------------------------------------------
// Checksum validation
// ---------------------------------------------------------------------------

function isAllEqual(digits: string): boolean {
	return digits.split("").every((c) => c === digits[0]);
}

export function isValidCpf(value: string): boolean {
	const d = stripDocument(value);
	if (d.length !== 11) return false;
	if (isAllEqual(d)) return false;

	const digits = d.split("").map(Number);

	// First check digit
	let sum = 0;
	for (let i = 0; i < 9; i++) {
		sum += digits[i] * (10 - i);
	}
	let rem = (sum * 10) % 11;
	if (rem === 10) rem = 0;
	if (rem !== digits[9]) return false;

	// Second check digit
	sum = 0;
	for (let i = 0; i < 10; i++) {
		sum += digits[i] * (11 - i);
	}
	rem = (sum * 10) % 11;
	if (rem === 10) rem = 0;
	return rem === digits[10];
}

export function isValidCnpj(value: string): boolean {
	const d = stripDocument(value);
	if (d.length !== 14) return false;
	if (isAllEqual(d)) return false;

	const digits = d.split("").map(Number);

	// First check digit — weights [5,4,3,2,9,8,7,6,5,4,3,2]
	const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
	let sum = 0;
	for (let i = 0; i < 12; i++) {
		sum += digits[i] * w1[i];
	}
	let rem = sum % 11;
	const check1 = rem < 2 ? 0 : 11 - rem;
	if (check1 !== digits[12]) return false;

	// Second check digit — weights [6,5,4,3,2,9,8,7,6,5,4,3,2]
	const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
	sum = 0;
	for (let i = 0; i < 13; i++) {
		sum += digits[i] * w2[i];
	}
	rem = sum % 11;
	const check2 = rem < 2 ? 0 : 11 - rem;
	return check2 === digits[13];
}

// ---------------------------------------------------------------------------
// CNPJ structural helpers
// ---------------------------------------------------------------------------

export function cnpjRoot(value: string): string {
	return stripDocument(value).slice(0, 8);
}

export function isMatrizCnpj(value: string): boolean {
	const d = stripDocument(value);
	return d.slice(8, 12) === "0001";
}

// ---------------------------------------------------------------------------
// Audit diff
// ---------------------------------------------------------------------------

function stableStringify(value: unknown): string {
	return JSON.stringify(value, (_k, v) =>
		v && typeof v === "object" && !Array.isArray(v)
			? Object.keys(v as Record<string, unknown>)
					.sort()
					.reduce(
						(acc, k) => {
							acc[k] = (v as Record<string, unknown>)[k];
							return acc;
						},
						{} as Record<string, unknown>,
					)
			: v,
	);
}

function truncate(value: unknown, max = AUDIT_DIFF_FIELD_TRUNCATE): unknown {
	if (typeof value === "string" && value.length > max) {
		return `${value.slice(0, max)}…`;
	}
	if (Array.isArray(value) || (value && typeof value === "object")) {
		const s = stableStringify(value);
		return s.length > max ? `${s.slice(0, max)}…` : value;
	}
	return value;
}

export function computeDiff<T extends Record<string, unknown>>(
	before: T,
	after: T,
): {
	changedFields: string[];
	metadata: Record<string, { from: unknown; to: unknown }>;
} {
	const changedFields: string[] = [];
	const metadata: Record<string, { from: unknown; to: unknown }> = {};

	for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
		if (stableStringify(before[key]) !== stableStringify(after[key])) {
			changedFields.push(key);
			metadata[key] = { from: truncate(before[key]), to: truncate(after[key]) };
		}
	}

	return { changedFields, metadata };
}
