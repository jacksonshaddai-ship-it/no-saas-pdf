import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      planCode: "FREE" | "PLUS" | "PREMIUM" | "ENTERPRISE" | "BUSINESS";
      role: "USER" | "ADMIN";
    };
  }

  interface User {
    id: string;
    planCode?: "FREE" | "PLUS" | "PREMIUM" | "ENTERPRISE" | "BUSINESS";
    role?: "USER" | "ADMIN";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    planCode?: "FREE" | "PLUS" | "PREMIUM" | "ENTERPRISE" | "BUSINESS";
    role?: "USER" | "ADMIN";
  }
}
