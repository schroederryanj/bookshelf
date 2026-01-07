import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /admin routes (except /admin/login)
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const sessionToken = request.cookies.get("admin_session")?.value;

    if (!sessionToken || !(await verifySession(sessionToken))) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  // Protect mutation API routes (POST, PUT, DELETE)
  if (pathname.startsWith("/api/") && ["POST", "PUT", "DELETE"].includes(request.method)) {
    // Allow /api/auth POST for login
    if (pathname === "/api/auth" && request.method === "POST") {
      return NextResponse.next();
    }

    const sessionToken = request.cookies.get("admin_session")?.value;

    if (!sessionToken || !(await verifySession(sessionToken))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
