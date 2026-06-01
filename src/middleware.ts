import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isAuth = !!req.auth;
  const isAuthPage =
    nextUrl.pathname.startsWith("/login") ||
    nextUrl.pathname.startsWith("/register");
  const isApi = nextUrl.pathname.startsWith("/api");

  if (isApi) return NextResponse.next();

  if (isAuthPage) {
    if (isAuth) return NextResponse.redirect(new URL("/", nextUrl));
    return NextResponse.next();
  }

  if (!isAuth) {
    const callbackUrl = nextUrl.pathname + nextUrl.search;
    const url = new URL("/login", nextUrl);
    if (callbackUrl !== "/") url.searchParams.set("callbackUrl", callbackUrl);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
