import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
	// `getSessionCookie` knows about the `__Secure-` prefix Better Auth applies
	// automatically on HTTPS (i.e. every Vercel deploy: preview *and* prod).
	// Hardcoding the bare `better-auth.session_token` name caused an
	// /admin → /login → /admin loop after magic-link verify: the cookie was
	// actually set as `__Secure-better-auth.session_token`, the proxy never
	// found it, but `auth.api.getSession()` inside the layouts/login page
	// *did* find it and bounced the user back to /admin — ERR_TOO_MANY_REDIRECTS.
	if (getSessionCookie(request)) {
		return NextResponse.next();
	}

	const loginUrl = new URL("/login", request.url);
	loginUrl.searchParams.set("next", request.nextUrl.pathname);
	return NextResponse.redirect(loginUrl);
}

export const config = {
	// `/login` lives outside the authenticated trees, so the matcher
	// doesn't need to special-case it. `/admin` (exact) is listed
	// separately so the bare path still triggers the cookie check —
	// otherwise `/admin/:path*` would let it slip through.
	matcher: ["/admin", "/admin/:path*", "/app/:path*"],
};
