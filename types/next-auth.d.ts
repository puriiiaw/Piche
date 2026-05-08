import "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role?: string;
    username?: string;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: "ADMIN" | "PM" | "VP";
      username: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    username?: string;
  }
}
