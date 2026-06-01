import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { authConfig } from "@/lib/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = z
          .object({
            email: z.string().email(),
            password: z.string().min(1),
          })
          .safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        // Lazy-load Node-only modules so this file can also be imported by
        // the auth.config consumer in middleware (Edge) without bundling them.
        const [{ db }, { users }, { eq }, bcrypt] = await Promise.all([
          import("@/lib/db").then((m) => ({ db: m.db })),
          import("@/lib/db/schema").then((m) => ({ users: m.users })),
          import("drizzle-orm").then((m) => ({ eq: m.eq })),
          import("bcryptjs").then((m) => m.default ?? m),
        ]);

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email.toLowerCase()))
          .limit(1);
        if (!user || !user.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email.split("@")[0],
          image: user.image ?? null,
        };
      },
    }),
  ],
});
