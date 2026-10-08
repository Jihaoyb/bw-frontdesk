import { headers } from "next/headers";
import { SESSION_HEADER } from "./center-config";
import { ensureSession, isSessionId, type DemoSession } from "./session";

/** The active demo session for this request, created and seeded on first use. */
export async function getActiveSession(): Promise<DemoSession> {
  const id = (await headers()).get(SESSION_HEADER);
  if (!isSessionId(id)) throw new Error("no demo session on request");
  return ensureSession(id);
}
