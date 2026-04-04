export type LegacyCompatibleRole =
  | "ADMIN"
  | "FUNCIONARIO"
  | "CONTADOR"
  | "ATTENDANT"
  | null
  | undefined;

export type NormalizedUserRole = "ADMIN" | "FUNCIONARIO" | "CONTADOR" | null;

export const normalizeUserRole = (
  role: LegacyCompatibleRole,
): NormalizedUserRole => {
  if (role === "ATTENDANT") {
    return "FUNCIONARIO";
  }

  if (role === "ADMIN" || role === "FUNCIONARIO" || role === "CONTADOR") {
    return role;
  }

  return null;
};

export const isAdminRole = (role: LegacyCompatibleRole) =>
  normalizeUserRole(role) === "ADMIN";

export const isEmployeeRole = (role: LegacyCompatibleRole) =>
  normalizeUserRole(role) === "FUNCIONARIO";

export const isAccountantRole = (role: LegacyCompatibleRole) =>
  normalizeUserRole(role) === "CONTADOR";

export const isStaffRole = (role: LegacyCompatibleRole) =>
  isEmployeeRole(role) || isAccountantRole(role);

export const getRoleLabel = (role: LegacyCompatibleRole) => {
  const normalized = normalizeUserRole(role);

  switch (normalized) {
    case "ADMIN":
      return "Administrador";
    case "CONTADOR":
      return "Contador";
    case "FUNCIONARIO":
      return "Funcionario";
    default:
      return "Usuario";
  }
};
