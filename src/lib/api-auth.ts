import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export type AuthedSession = {
  userId: string;
  email: string;
  name: string;
};

/**
 * Returns the current user's session, or a 401 NextResponse to be returned by the caller.
 */
export async function requireUser(): Promise<
  { ok: true; session: AuthedSession } | { ok: false; response: NextResponse }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return {
    ok: true,
    session: {
      userId: session.user.id,
      email: session.user.email ?? "",
      name: session.user.name ?? "",
    },
  };
}
