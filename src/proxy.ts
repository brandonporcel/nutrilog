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
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Protected routes require a session.
  if (!user && pathname === "/dashboard") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
