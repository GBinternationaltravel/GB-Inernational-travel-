import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { loginSchema } from "@/lib/validations/auth";
import { verifyPassword } from "@/lib/auth/password";
import { findUserByEmail } from "@/services/user-service";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await findUserByEmail(parsed.data.email.toLowerCase());
        if (!user?.passwordHash) return null;
        if (user.isActive === false) return null;

        const valid = await verifyPassword(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        const { isStaffRole } = await import("@/lib/auth/permissions");
        if (isStaffRole(user.role)) {
          const { writeAuditLog } = await import("@/lib/security/audit");
          await writeAuditLog({
            userId: user.id,
            action: "ADMIN_LOGIN",
            entityType: "User",
            entityId: user.id,
            metadata: { email: user.email, role: user.role },
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "CUSTOMER";
        token.firstName = user.firstName;
        token.lastName = user.lastName;
      }

      if (trigger === "update" && session) {
        const update = session as {
          firstName?: string;
          lastName?: string;
          name?: string;
        };
        if (update.firstName !== undefined) token.firstName = update.firstName;
        if (update.lastName !== undefined) token.lastName = update.lastName;
        if (update.name !== undefined) token.name = update.name;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? "";
        session.user.role = token.role ?? "CUSTOMER";
        session.user.firstName = token.firstName ?? null;
        session.user.lastName = token.lastName ?? null;
        session.user.email = token.email ?? session.user.email ?? "";
      }
      return session;
    },
  },
});
