const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🔐 Gerando hash seguro para a senha...");

  /* Hash da senha exata solicitada */
  const password = "18011989Lp*";
  const hashedPassword = await bcrypt.hash(password, 10);

  console.log("🔄 Atualizando usuário no banco de dados...");

  const user = await prisma.user.upsert({
    where: { email: "admin@multicell.com" },
    update: { password: hashedPassword },
    create: {
      email: "admin@multicell.com",
      password: hashedPassword,
    },
  });

  console.log(`✅ SUCESSO! Usuário [${user.email}] atualizado.`);
  console.log(
    `🔑 Senha no banco agora começa com: ${user.password.substring(
      0,
      10
    )}... (Criptografada)`
  );
}

main()
  .catch((e) => {
    console.error("❌ Erro fatal:", e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
