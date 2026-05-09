// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn();
const nextMock = vi.fn(() => ({ kind: "next" }));
const getSessionCookieMock = vi.fn();

vi.mock("next/server", () => ({
	// biome-ignore lint/style/useNamingConvention: must match the actual export name from next/server
	NextResponse: {
		redirect: (url: URL) => {
			redirectMock(url.toString());
			return { kind: "redirect", url };
		},
		next: () => nextMock(),
	},
}));

// Delegate the cookie lookup to Better Auth's helper so the proxy stays
// agnostic of the `__Secure-` prefix it adds on HTTPS. The mock lets each
// test simulate "cookie present" / "cookie missing" without recreating the
// header parsing.
vi.mock("better-auth/cookies", () => ({
	getSessionCookie: (req: unknown) => getSessionCookieMock(req),
}));

const { proxy } = await import("./proxy");

function makeRequest(pathname: string) {
	const url = new URL(`http://localhost:3000${pathname}`);
	return { nextUrl: url, url: url.toString() } as never;
}

describe("proxy", () => {
	it("calls next() when session cookie is present on /admin", () => {
		redirectMock.mockClear();
		getSessionCookieMock.mockReturnValueOnce("session-payload");
		proxy(makeRequest("/admin"));
		expect(redirectMock).not.toHaveBeenCalled();
	});

	it("redirects to /login when no session cookie on /admin", () => {
		redirectMock.mockClear();
		getSessionCookieMock.mockReturnValueOnce(null);
		proxy(makeRequest("/admin"));
		expect(redirectMock).toHaveBeenCalledTimes(1);
		expect(redirectMock.mock.calls[0]?.[0]).toContain("/login");
		// `/admin` exact must also carry next= so the user lands back on the
		// intended page after login.
		expect(redirectMock.mock.calls[0]?.[0]).toContain("next=%2Fadmin");
	});

	it("preserves the original path in ?next when redirecting", () => {
		redirectMock.mockClear();
		getSessionCookieMock.mockReturnValueOnce(null);
		proxy(makeRequest("/admin/clients"));
		const target = redirectMock.mock.calls[0]?.[0] ?? "";
		expect(target).toContain("/login");
		expect(target).toContain("next=%2Fadmin%2Fclients");
	});

	it("redirects to /login when no session cookie on /app", () => {
		redirectMock.mockClear();
		getSessionCookieMock.mockReturnValueOnce(null);
		proxy(makeRequest("/app/dashboard"));
		expect(redirectMock).toHaveBeenCalledTimes(1);
		expect(redirectMock.mock.calls[0]?.[0]).toContain("/login");
		expect(redirectMock.mock.calls[0]?.[0]).toContain(
			"next=%2Fapp%2Fdashboard",
		);
	});

	it("calls next() when session cookie is present on /app", () => {
		redirectMock.mockClear();
		getSessionCookieMock.mockReturnValueOnce("session-payload");
		proxy(makeRequest("/app/dashboard"));
		expect(redirectMock).not.toHaveBeenCalled();
	});

	// Regression: the previous implementation called
	// `request.cookies.has("better-auth.session_token")`, which never matched
	// on HTTPS because Better Auth sets the cookie under the `__Secure-`
	// prefix. The result was an /admin → /login → /admin loop after every
	// magic-link verify on preview/prod. Delegating to `getSessionCookie`
	// fixes it; this test pins the delegation so a future "simplification"
	// back to `request.cookies.has(...)` fails in CI.
	it("delegates the cookie lookup to better-auth/cookies", () => {
		redirectMock.mockClear();
		getSessionCookieMock.mockClear();
		getSessionCookieMock.mockReturnValueOnce("session-payload");
		const request = makeRequest("/admin");
		proxy(request);
		expect(getSessionCookieMock).toHaveBeenCalledTimes(1);
		expect(getSessionCookieMock).toHaveBeenCalledWith(request);
		expect(redirectMock).not.toHaveBeenCalled();
	});
});

// The matcher is what guarantees `/login` never reaches `proxy()` at the
// Edge — but config is declarative and easy to break by accident. Pin it
// here so a future refactor that drops `/login` outside the negative
// space (e.g. switching to a catch-all) fails in CI rather than at
// runtime.
describe("proxy matcher", () => {
	it("scopes the middleware to authenticated trees only", async () => {
		const { config } = await import("./proxy");
		expect(config.matcher).toEqual(["/admin", "/admin/:path*", "/app/:path*"]);
		expect(config.matcher).not.toContain("/login");
	});
});
