"use server";

import { revalidatePath } from "next/cache";
import { getActiveSession } from "@/lib/request-session";
import { resetSessionContent } from "@/lib/session";

export async function resetDemoAction(formData: FormData): Promise<void> {
  if (formData.get("confirm") !== "yes") return; // cancellation changes nothing
  const session = await getActiveSession();
  await resetSessionContent(session.id);
  revalidatePath("/", "layout");
}
