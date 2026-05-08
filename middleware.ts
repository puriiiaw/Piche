import { auth } from "@/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const path = req.nextUrl.pathname;
  const isLoginPage = path === "/login";
  const isPublic = path.startsWith("/_next") || path.startsWith("/api/auth") || path === "/Logo.png";

  if (isPublic) return;
  if (!isLoggedIn && !isLoginPage) {
    return Response.redirect(new URL("/login", req.url));
  }
  if (isLoggedIn && isLoginPage) {
    return Response.redirect(new URL("/", req.url));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|Logo.png).*)"],
};
