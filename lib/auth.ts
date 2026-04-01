import { cookies } from "next/headers";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type Session = {
  user: {
    id?: string; // Add optional ID
    email: string;
    companyId: string;
    role?: UserRole;
    fullName?: string | null;
  };
} | null;

export type AuthenticatedUser = {
  id: string;
  email: string;
  companyId: string;
  role: UserRole;
  fullName: string | null;
  cpf: string | null;
  birthDate: Date | null;
};

export async function getSession(): Promise<Session> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token");

  if (!token) return null;

  try {
    const sessionData = JSON.parse(token.value);
    return {
      user: {
        id: sessionData.id, // Try to get ID from token
        email: sessionData.email,
        companyId: sessionData.companyId,
        role: sessionData.role,
        fullName: sessionData.fullName ?? null,
      },
    };
  } catch (e) {
    return null;
  }
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const session = await getSession();

  if (!session) {
    return null;
  }

  const baseSelect = {
    id: true,
    email: true,
    companyId: true,
    role: true,
    fullName: true,
    name: true,
    cpf: true,
    birthDate: true,
  } as const;

  const user = session.user.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: baseSelect,
      })
    : await prisma.user.findUnique({
        where: { email: session.user.email },
        select: baseSelect,
      });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    companyId: user.companyId,
    role: user.role,
    fullName: user.fullName || user.name || null,
    cpf: user.cpf,
    birthDate: user.birthDate,
  };
}

export const isAdminUser = (
  user: Pick<AuthenticatedUser, "role"> | null | undefined,
) => user?.role === "ADMIN";
