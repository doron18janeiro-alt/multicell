export const EXPENSE_CATEGORIES = [
  "ALUGUEL",
  "AGUA",
  "ENERGIA",
  "INTERNET",
  "ADIANTAMENTO_SALARIAL",
  "COMPRA_ESTOQUE",
  "OUTROS",
] as const;

export const EXPENSE_TYPES = ["SHOP", "PERSONAL"] as const;

export const EXPENSE_STATUSES = ["PENDING", "PAID"] as const;

export const EXPENSE_PAYMENT_METHODS = [
  "PIX",
  "DINHEIRO",
  "CARTAO",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type ExpenseType = (typeof EXPENSE_TYPES)[number];
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];
export type ExpensePaymentMethod = (typeof EXPENSE_PAYMENT_METHODS)[number];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  ALUGUEL: "Aluguel",
  AGUA: "Agua",
  ENERGIA: "Energia",
  INTERNET: "Internet",
  ADIANTAMENTO_SALARIAL: "Adiantamento Salarial",
  COMPRA_ESTOQUE: "Compra de Estoque",
  OUTROS: "Outros",
};

export const EXPENSE_TYPE_LABELS: Record<ExpenseType, string> = {
  SHOP: "Despesa da Loja",
  PERSONAL: "Despesa Pessoal",
};

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  PENDING: "Pendente",
  PAID: "Pago",
};

export const EXPENSE_PAYMENT_METHOD_LABELS: Record<
  ExpensePaymentMethod,
  string
> = {
  PIX: "PIX",
  DINHEIRO: "Dinheiro",
  CARTAO: "Cartao",
};

export const isExpenseCategory = (value: string): value is ExpenseCategory =>
  EXPENSE_CATEGORIES.includes(value as ExpenseCategory);

export const isExpenseType = (value: string): value is ExpenseType =>
  EXPENSE_TYPES.includes(value as ExpenseType);

export const isExpenseStatus = (value: string): value is ExpenseStatus =>
  EXPENSE_STATUSES.includes(value as ExpenseStatus);

export const isExpensePaymentMethod = (
  value: string,
): value is ExpensePaymentMethod =>
  EXPENSE_PAYMENT_METHODS.includes(value as ExpensePaymentMethod);

export const formatExpenseDateInput = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

export const parseBrazilDateInput = (value: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00.000-03:00`);
  }

  return new Date(value);
};

export const isExpenseOverdue = (dueDate: string | Date, status: string) => {
  if (status !== "PENDING") return false;

  const due = dueDate instanceof Date ? dueDate : new Date(dueDate);
  const dueEnd = new Date(due);
  dueEnd.setHours(23, 59, 59, 999);

  return dueEnd.getTime() < Date.now();
};

export const addOneMonthToExpenseDate = (value: string | Date) => {
  const current =
    value instanceof Date ? new Date(value) : parseBrazilDateInput(value);

  const originalDay = current.getDate();
  const targetYear = current.getFullYear();
  const targetMonth = current.getMonth() + 1;
  const lastDayOfTargetMonth = new Date(
    targetYear,
    targetMonth + 1,
    0,
    12,
    0,
    0,
    0,
  ).getDate();

  return new Date(
    targetYear,
    targetMonth,
    Math.min(originalDay, lastDayOfTargetMonth),
    12,
    0,
    0,
    0,
  );
};
