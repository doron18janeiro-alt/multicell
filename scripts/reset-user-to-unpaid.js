const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const normalizeEmail = (value) =>
  String(value || "")
    .replace(/\\r|\\n/g, "")
    .replace(/\r|\n/g, "")
    .trim()
    .toLowerCase();

const getArgValue = (name) => {
  const arg = process.argv.find((entry) => entry.startsWith(`${name}=`));
  if (!arg) return "";
  return arg.slice(name.length + 1);
};

async function main() {
  const positionalEmail = process.argv
    .slice(2)
    .find((entry) => !entry.startsWith("--"));
  const cliEmail = normalizeEmail(getArgValue("--email") || positionalEmail);
  const envEmail = normalizeEmail(process.env.ADMIN_EMAIL);
  const targetEmail = cliEmail || envEmail;
  const status = String(getArgValue("--status") || "unpaid").toLowerCase();
  const trialDays = Number(getArgValue("--trial-days") || "7");

  if (status !== "unpaid" && status !== "trialing") {
    throw new Error("Use --status=unpaid ou --status=trialing.");
  }

  if (!targetEmail) {
    throw new Error(
      "Informe um e-mail no argumento ou defina ADMIN_EMAIL no ambiente.",
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: targetEmail },
    select: { email: true, companyId: true },
  });

  if (!user) {
    throw new Error(`Usuário não encontrado para ${targetEmail}.`);
  }

  const trialEndsAt = new Date();
  if (status === "trialing") {
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);
  } else {
    trialEndsAt.setHours(0, 0, 0, 0);
  }

  await prisma.company.update({
    where: { id: user.companyId },
    data: {
      subscriptionStatus: status,
      trialEndsAt,
      mpSubscriptionId: null,
    },
  });

  console.log(
    `Company ${user.companyId} atualizada para ${status} com trialEndsAt ${trialEndsAt.toISOString()} (${user.email}).`,
  );
}

main()
  .catch((error) => {
    console.error("Falha ao resetar usuário para unpaid:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
