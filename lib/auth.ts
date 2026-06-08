import "server-only";

import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";

import { prisma } from "@/lib/prisma";

// ===========================================================================
// Configuração do NextAuth (v4, estável, App Router friendly)
// ===========================================================================

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: {
    signIn: "/auth/signin",
    newUser: "/account",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    CredentialsProvider({
      id: "credentials",
      name: "E-mail e senha",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.isActive || !user.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        const planCode = normalizeAuthPlanCode(user.planCode);
        const role = user.role === "ADMIN" ? "ADMIN" : "USER";

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          planCode,
          role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id: string }).id;
        const planCode = normalizeAuthPlanCode((user as { planCode?: string }).planCode);
        const role = (user as { role?: "USER" | "ADMIN" }).role ?? "USER";
        token.planCode = planCode;
        token.role = role;
      } else if (token.id) {
        // Refresh planCode/role do banco a cada request (barato, 1 linha por user)
        const fresh = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { planCode: true, role: true, isActive: true },
        });
        if (!fresh || !fresh.isActive) {
          // Token inválido: esvaziar faz a sessão expirar.
          token.id = undefined;
          token.planCode = undefined;
          token.role = undefined;
          return token;
        }
        token.planCode = normalizeAuthPlanCode(fresh.planCode);
        token.role = fresh.role === "ADMIN" ? "ADMIN" : "USER";
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { planCode?: "FREE" | "PLUS" | "PREMIUM" | "ENTERPRISE" | "BUSINESS" }).planCode = token.planCode ?? "FREE";
        (session.user as { role?: "USER" | "ADMIN" }).role = token.role ?? "USER";
      }
      return session;
    },
  },
};

// ===========================================================================
// Helper de sessão em server components / route handlers
// ===========================================================================

export async function auth() {
  return getServerSession(authOptions);
}

export type AuthUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  planCode: "FREE" | "PLUS" | "PREMIUM" | "ENTERPRISE" | "BUSINESS";
  role: "USER" | "ADMIN";
};

// PlanCodes canonicos da Fase 4/5. Aceita o legado "BUSINESS" e trata
// como "PREMIUM" para nao quebrar a logica que ja conhecia esses dois.
export type AuthPlanCode = "FREE" | "PLUS" | "PREMIUM" | "ENTERPRISE" | "BUSINESS";

export function normalizeAuthPlanCode(planCode: string | null | undefined): AuthPlanCode {
  if (planCode === "PLUS" || planCode === "PREMIUM" || planCode === "ENTERPRISE" || planCode === "BUSINESS" || planCode === "FREE") {
    return planCode;
  }
  return "FREE";
}
