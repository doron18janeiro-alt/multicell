const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🔐 Gerando hash seguro para a senha...");

  /* Hash da senha exata solicitada */
  const password = "18011989Lp*";
  const hashedPassword = await bcrypt.hash(password, 10);

  console.log("🔄 Atualizando usuários no banco de dados...");

  // Usuário 1: admin@multicell.com
  await prisma.user.upsert({
    where: { email: "admin@multicell.com" },
    update: { password: hashedPassword },
    create: {
      email: "admin@multicell.com",
      password: hashedPassword,
    },
  });
  console.log("✅ admin@multicell.com atualizado.");

  // Usuário 2: doron18janeiro@gmail.com
  await prisma.user.upsert({
    where: { email: "doron18janeiro@gmail.com" },
    update: { password: hashedPassword },
    create: {
      email: "doron18janeiro@gmail.com",
      password: hashedPassword,
    },
  });
  console.log("✅ doron18janeiro@gmail.com atualizado.");
}

main()
  .catch((e) => {
    console.error("❌ Erro fatal:", e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
