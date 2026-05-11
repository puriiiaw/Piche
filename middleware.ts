import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function hasSessionCookie(request: NextRequest) {
  return request.cookies.has("authjs.session-token")
    || request.cookies.has("__Secure-authjs.session-token")
    || request.cookies.has("next-auth.session-token")
    || request.cookies.has("__Secure-next-auth.session-token");
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isLoginPage = path === "/login";
  const isPublic = path.startsWith("/_next") || path.startsWith("/api/auth") || path === "/Logo.png";
  const isLoggedIn = hasSessionCookie(request);

  if (isPublic) return NextResponse.next();
  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|Logo.png).*)"]
};
