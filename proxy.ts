import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest): NextResponse {
  const path = request.nextUrl.pathname;
  if (
    path.startsWith("/api") ||
    path.startsWith("/apply") ||
    path.startsWith("/login") ||
    path.startsWith("/sc-send-links")
  ) {
    return NextResponse.next();
  }

  const authToken = request.cookies.get("auth_token")?.value;
  if (!authToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
