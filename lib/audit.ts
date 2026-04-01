import type { AuditAction, Prisma, PrismaClient } from "@prisma/client";
import type { AuthenticatedUser } from "@/lib/auth";

type AuditClient = PrismaClient | Prisma.TransactionClient;

type CreateAuditLogInput = {
  companyId: string;
  userName: string;
  action: AuditAction;
  tableName: string;
  description: string;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

const dayFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export function getAuditActorName(
  user: Pick<AuthenticatedUser, "fullName" | "email"> | null | undefined,
) {
  return user?.fullName?.trim() || user?.email || "Usuário";
}

export function formatAuditCurrency(
  value: number | string | { toString(): string } | null | undefined,
) {
  const normalizedValue = Number(
    typeof value === "object" && value !== null ? value.toString() : value,
  );
  return currencyFormatter.format(
    Number.isFinite(normalizedValue) ? normalizedValue : 0,
  );
}

export function formatAuditDate(value: Date | string) {
  return dayFormatter.format(
    typeof value === "string" ? new Date(value) : value,
  );
}

export function formatAuditDateTime(value: Date | string) {
  return dateFormatter.format(
    typeof value === "string" ? new Date(value) : value,
  );
}

export async function createAuditLog(
  client: AuditClient,
  input: CreateAuditLogInput,
) {
  await client.auditLog.create({
    data: {
      companyId: input.companyId,
      userName: input.userName,
      action: input.action,
      tableName: input.tableName,
      description: input.description,
    },
  });
}
