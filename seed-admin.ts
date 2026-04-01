{
  const { PrismaClient } = require("@prisma/client");
  const bcrypt = require("bcryptjs");

  const prisma = new PrismaClient();

  const normalizeEnvValue = (value: string | undefined) => {
    return String(value || "")
      .replace(/\\r|\\n/g, "")
      .replace(/\r|\n/g, "")
      .trim();
  };

  const getEnv = (key: string) => {
    const value = normalizeEnvValue(process.env[key]);
    if (!value) {
      throw new Error(`Variável de ambiente obrigatória ausente: ${key}`);
    }
    return value;
  };

  async function runSeedAdmin() {
    const adminEmail = getEnv("ADMIN_EMAIL").toLowerCase();
    const adminPassword = getEnv("ADMIN_PASSWORD");
    const secondaryEmail = normalizeEnvValue(
      process.env.SECONDARY_ADMIN_EMAIL,
    ).toLowerCase();

    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    await prisma.company.upsert({
      where: { id: "multicell-oficial" },
      update: {
        name: "Multicell Oficial",
        trialEndsAt,
        subscriptionStatus: "active",
        mpSubscriptionId: null,
      },
      create: {
        id: "multicell-oficial",
        name: "Multicell Oficial",
        trialEndsAt,
        subscriptionStatus: "active",
      },
    });

    await prisma.companyConfig.upsert({
      where: { companyId: "multicell-oficial" },
      update: {
        name: "Multicell Oficial",
      },
      create: {
        companyId: "multicell-oficial",
        name: "Multicell Oficial",
      },
    });

    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        password: hashedPassword,
        companyId: "multicell-oficial",
      },
      create: {
        name: "Administrador",
        email: adminEmail,
        password: hashedPassword,
        companyId: "multicell-oficial",
      },
    });

    if (secondaryEmail) {
      await prisma.user.upsert({
        where: { email: secondaryEmail },
        update: {
          password: hashedPassword,
          companyId: "multicell-oficial",
        },
        create: {
          name: "Administrador",
          email: secondaryEmail,
          password: hashedPassword,
          companyId: "multicell-oficial",
        },
      });
    }
  }

  runSeedAdmin()
    .catch((error: unknown) => {
      console.error("Erro ao executar seed:", error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
