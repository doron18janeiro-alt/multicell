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

const normalizeEmail = (value: string | null | undefined) =>
  String(value || "").trim().toLowerCase();

const logAuth = (label: string, details?: Record<string, unknown>) => {
  console.log(`[Auth] ${label}`, details || {});
};

export async function getSession(): Promise<Session> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token");

  if (!token) {
    logAuth("No auth token");
    return null;
  }

  try {
    const sessionData = JSON.parse(token.value);
    logAuth("Session parsed", {
      id: sessionData.id || null,
      email: sessionData.email || null,
      companyId: sessionData.companyId || null,
      role: sessionData.role || null,
    });
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
    logAuth("Session parse failed", {
      error: e instanceof Error ? e.message : String(e),
    });
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

  const userById = session.user.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: baseSelect,
      })
    : null;

  if (userById) {
    logAuth("Current user resolved by id", {
      id: userById.id,
      email: userById.email,
      role: userById.role,
    });
  }

  const user =
    userById ||
    (await prisma.user.findUnique({
      where: { email: session.user.email },
      select: baseSelect,
    }));

  if (!user) {
    logAuth("Current user not found", {
      sessionId: session.user.id || null,
      sessionEmail: session.user.email,
    });
    return null;
  }

  if (!userById && session.user.id) {
    logAuth("Current user resolved by email fallback", {
      previousId: session.user.id,
      id: user.id,
      email: user.email,
      role: user.role,
    });
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

export const getResponsibleEngineerEmail = () =>
  normalizeEmail(process.env.ADMIN_EMAIL) || "admin@multicellsystem.com.br";

export const isResponsibleEngineerUser = (
  user: Pick<AuthenticatedUser, "email" | "role"> | null | undefined,
) =>
  user?.role === "ADMIN" &&
  normalizeEmail(user?.email) === getResponsibleEngineerEmail();
