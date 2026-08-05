import { NextResponse, type NextRequest } from "next/server";

import { createProxyClient } from "@/lib/supabase/session";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  const supabase = createProxyClient(request, response);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Authenticated users do not belong on the auth screens.
  if (user && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/products", request.url));
  }

  // Protected routes require a session.
  const protectedPaths = ["/dashboard", "/units", "/history", "/templates"];
  const isProtected =
    protectedPaths.includes(pathname) ||
    pathname === "/products" ||
    pathname.startsWith("/products/") ||
    pathname.startsWith("/templates/") ||
    pathname.startsWith("/meals/");
  if (!user && isProtected) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
