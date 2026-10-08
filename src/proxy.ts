import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, SESSION_HEADER } from "@/lib/center-config";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Assigns a demo session id on first visit. No account creation. The id is an
// httpOnly cookie; the server resolves and scopes all data by it.
export function proxy(request: NextRequest) {
  const existing = request.cookies.get(SESSION_COOKIE)?.value;
  const sessionId = existing && UUID_RE.test(existing) ? existing : crypto.randomUUID();

  const headers = new Headers(request.headers);
  headers.set(SESSION_HEADER, sessionId);
  const response = NextResponse.next({ request: { headers } });

  if (sessionId !== existing) {
    response.cookies.set({
      name: SESSION_COOKIE,
      value: sessionId,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
