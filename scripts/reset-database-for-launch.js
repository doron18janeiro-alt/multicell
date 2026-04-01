const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const getCounts = async () => {
  const [
    users,
    companies,
    companyConfig,
    customers,
    suppliers,
    products,
    productBatches,
    serviceOrders,
    sales,
    saleItems,
    dailyClosing,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.company.count(),
    prisma.companyConfig.count(),
    prisma.customer.count(),
    prisma.supplier.count(),
    prisma.product.count(),
    prisma.productBatch.count(),
    prisma.serviceOrder.count(),
    prisma.sale.count(),
    prisma.saleItem.count(),
    prisma.dailyClosing.count(),
  ]);

  return {
    users,
    companies,
    companyConfig,
    customers,
    suppliers,
    products,
    productBatches,
    serviceOrders,
    sales,
    saleItems,
    dailyClosing,
  };
};

async function main() {
  const before = await getCounts();
  console.log("Registros antes da limpeza:");
  console.log(JSON.stringify(before, null, 2));

  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "sale_items",
      "sales",
      "product_batches",
      "products",
      "suppliers",
      "os",
      "clients",
      "daily_closing",
      "company_config",
      "users",
      "companies"
    RESTART IDENTITY CASCADE
  `);

  const after = await getCounts();
  console.log("Registros depois da limpeza:");
  console.log(JSON.stringify(after, null, 2));
}

main()
  .catch((error) => {
    console.error("Falha ao resetar o banco:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
