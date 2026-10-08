import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { SESSION_COOKIE, SESSION_HEADER } from "@/lib/center-config";

const UUID_RE = /^[0-9a-f-]{36}$/i;

describe("session cookie assignment", () => {
  it("assigns an httpOnly session cookie on a first visit without any sign-up", () => {
    const res = proxy(new NextRequest("http://localhost/parent"));
    const cookie = res.cookies.get(SESSION_COOKIE);
    expect(cookie?.value).toMatch(UUID_RE);
    expect(cookie?.httpOnly).toBe(true);
    expect(res.headers.get("x-middleware-request-" + SESSION_HEADER)).toBe(cookie?.value);
  });

  it("keeps an existing valid cookie and replaces a tampered one", () => {
    const id = "11111111-2222-4333-8444-555555555555";
    const keep = proxy(new NextRequest("http://localhost/parent", { headers: { cookie: `${SESSION_COOKIE}=${id}` } }));
    expect(keep.cookies.get(SESSION_COOKIE)).toBeUndefined(); // not re-set
    expect(keep.headers.get("x-middleware-request-" + SESSION_HEADER)).toBe(id);

    const bad = proxy(new NextRequest("http://localhost/parent", { headers: { cookie: `${SESSION_COOKIE}=1 OR 1=1` } }));
    const fresh = bad.cookies.get(SESSION_COOKIE)?.value;
    expect(fresh).toMatch(UUID_RE);
    expect(fresh).not.toBe("1 OR 1=1");
  });
});
