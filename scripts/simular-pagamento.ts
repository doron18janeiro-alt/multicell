{
  const { PrismaClient } = require("@prisma/client");

  const prisma = new PrismaClient();

  const getArgValue = (name: string) => {
    const arg = process.argv.find((entry: string) =>
      entry.startsWith(`${name}=`),
    );

    if (!arg) return "";
    return arg.slice(name.length + 1);
  };

  const getBaseUrl = () => {
    return getArgValue("--url") || "http://localhost:3000";
  };

  const getCompanyId = () => {
    const positionalArg = process.argv
      .slice(2)
      .find((entry: string) => !entry.startsWith("--"));

    return getArgValue("--company") || positionalArg || "multicell-oficial";
  };

  async function runPaymentSimulation() {
    const companyId = getCompanyId();
    const baseUrl = getBaseUrl().replace(/\/$/, "");
    const webhookUrl = `${baseUrl}/api/webhooks/mercadopago`;

    const payload = {
      type: "payment",
      status: "approved",
      external_reference: companyId,
    };

    console.log(`POST ${webhookUrl}`);
    console.log(`Payload: ${JSON.stringify(payload)}`);

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log(`Webhook respondeu com HTTP ${response.status}`);
    console.log(responseText);

    if (!response.ok) {
      throw new Error(`Falha ao chamar webhook: HTTP ${response.status}`);
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        subscriptionStatus: true,
        mpSubscriptionId: true,
        updatedAt: true,
      },
    });

    console.log("Status atual da empresa:");
    console.log(JSON.stringify(company, null, 2));
  }

  runPaymentSimulation()
    .catch((error: unknown) => {
      console.error("Erro ao simular pagamento:", error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
