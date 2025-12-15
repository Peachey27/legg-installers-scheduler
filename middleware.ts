import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/login", "/api/logout", "/_next", "/favicon.ico"];
const COOKIE_NAME = "scheduler_auth";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (cookie === "1") return NextResponse.next();

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
