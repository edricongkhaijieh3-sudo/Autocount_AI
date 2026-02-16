import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const { pathname } = request.nextUrl;

  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register");

  const isSelectCompanyPage = pathname.startsWith("/select-company");

  // If user is on auth page (login/register) and already logged in, redirect to company selector
  if (isAuthPage && token) {
    return NextResponse.redirect(new URL("/select-company", request.url));
  }

  // If user is not logged in and trying to access any protected route
  if (!isAuthPage && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/invoices/:path*",
    "/accounts/:path*",
    "/contacts/:path*",
    "/journal/:path*",
    "/templates/:path*",
    "/settings/:path*",
    "/reports/:path*",
    "/products/:path*",
    "/currencies/:path*",
    "/tax-codes/:path*",
    "/tariff-codes/:path*",
    "/tax-entities/:path*",
    "/product-categories/:path*",
    "/select-company",
    "/login",
    "/register",
  ],
};
