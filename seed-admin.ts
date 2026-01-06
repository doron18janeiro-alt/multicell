const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  // 1. Fix User Password
  // Hash the specific password requested: '18011989Lp*'
  const hashedPassword = await bcrypt.hash("18011989Lp*", 10);

  // Upsert ensures we create it if it doesn't exist, or update if it does.
  await prisma.user.upsert({
    where: { email: "admin@multicell.com" },
    update: { password: hashedPassword },
    create: {
      email: "admin@multicell.com",
      password: hashedPassword,
    },
  });
  console.log("✅ Usuário Admin atualizado com senha protegida!");

  // 2. Cleanup Bad Customer Data
  // User mentioned they put the email in the 'id' field of Customer table.
  try {
    const badId = "admin@multicell.com";
    const badCustomer = await prisma.customer.findUnique({
      where: { id: badId },
    });
    if (badCustomer) {
      await prisma.customer.delete({ where: { id: badId } });
      console.log(
        `✅ Registro de cliente incorreto (ID: ${badId}) removido com sucesso.`
      );
    } else {
      console.log("ℹ️ Nenhum cliente com ID incorreto encontrado.");
    }
  } catch (e) {
    console.log("⚠️ Nota: Verificação de limpeza de dados concluída.");
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
