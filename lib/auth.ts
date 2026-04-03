import { cookies } from "next/headers";
import type { Segment, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type SessionSnapshot = {
  id?: string;
  email: string;
  companyId: string;
  role?: UserRole;
  fullName?: string | null;
  companyName?: string | null;
  segment?: Segment | null;
  cpf?: string | null;
  birthDate?: string | null;
  isDeveloper?: boolean;
};

export type Session = {
  user: SessionSnapshot;
} | null;

export type AuthenticatedUser = {
  id: string;
  email: string;
  companyId: string;
  role: UserRole;
  fullName: string | null;
  companyName: string | null;
  segment: Segment | null;
  cpf: string | null;
  birthDate: Date | null;
  isDeveloper: boolean;
};

const normalizeEmail = (value: string | null | undefined) =>
  String(value || "").trim().toLowerCase();

const logAuth = (label: string, details?: Record<string, unknown>) => {
  console.log(`[Auth] ${label}`, details || {});
};

const getSessionCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 7,
  path: "/",
});

export async function setAuthSession(session: SessionSnapshot) {
  const cookieStore = await cookies();
  cookieStore.set("auth_token", JSON.stringify(session), getSessionCookieOptions());
}

export const createAuthSessionSnapshot = (session: SessionSnapshot): SessionSnapshot => ({
  ...session,
  isDeveloper:
    session.isDeveloper ??
    isResponsibleEngineerUser({
      email: session.email,
      role: session.role,
    }),
});

export async function clearAuthSession() {
  const cookieStore = await cookies();
  cookieStore.set("auth_token", "", {
    ...getSessionCookieOptions(),
    maxAge: 0,
  });
}

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
      segment: sessionData.segment || null,
    });
    return {
      user: {
        id: sessionData.id,
        email: sessionData.email,
        companyId: sessionData.companyId,
        role: sessionData.role,
        fullName: sessionData.fullName ?? null,
        companyName:
          "companyName" in sessionData ? sessionData.companyName ?? null : undefined,
        segment: "segment" in sessionData ? sessionData.segment ?? null : undefined,
        cpf: "cpf" in sessionData ? sessionData.cpf ?? null : undefined,
        birthDate:
          "birthDate" in sessionData ? sessionData.birthDate ?? null : undefined,
        isDeveloper:
          "isDeveloper" in sessionData ? Boolean(sessionData.isDeveloper) : undefined,
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
    company: {
      select: {
        name: true,
        segment: true,
      },
    },
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
    companyName: user.company?.name || session.user.companyName || null,
    segment: user.company?.segment || session.user.segment || null,
    cpf: user.cpf,
    birthDate: user.birthDate,
    isDeveloper: isResponsibleEngineerUser(user),
  };
}

export const isAdminUser = (
  user: Pick<AuthenticatedUser, "role"> | null | undefined,
) => user?.role === "ADMIN";

export const getResponsibleEngineerEmails = () => {
  const envEmail = normalizeEmail(process.env.ADMIN_EMAIL);

  return new Set(
    [envEmail, "admin@teste.com", "seu-email@wtm.com.br"].filter(Boolean),
  );
};

export const getResponsibleEngineerEmail = () =>
  Array.from(getResponsibleEngineerEmails())[0] || "admin@teste.com";

export const isResponsibleEngineerUser = (
  user: Pick<AuthenticatedUser, "email" | "role"> | null | undefined,
) =>
  user?.role === "ADMIN" &&
  getResponsibleEngineerEmails().has(normalizeEmail(user?.email));
