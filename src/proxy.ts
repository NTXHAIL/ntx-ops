import { NextResponse, type NextRequest } from "next/server";
import { hasPooledDatabaseUrl } from "@/lib/database-presence";
import { SESSION_COOKIE } from "@/lib/session";

function isPublicPath(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/privacy" ||
    pathname.startsWith("/storm/")
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!hasPooledDatabaseUrl()) {
    if (pathname === "/setup") return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = "/setup";
    url.search = "";
    return NextResponse.rewrite(url);
  }
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const isPublic = isPublicPath(pathname);

  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(token ? "/dashboard" : "/login", request.url),
    );
  }

  if (!token && !isPublic) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (token && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/estimate-photos/:path*",
    "/lead-photos/:path*",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
