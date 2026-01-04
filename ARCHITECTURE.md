# Arquitetura do Sistema MULTICELL

## 1. Visão Geral

Sistema de gestão para assistência técnica e vendas, focado em performance e design "Hi-tech".

## 2. Stack Tecnológica

- **Framework:** Next.js 14 (App Router)
- **Linguagem:** TypeScript
- **Estilo:** Tailwind CSS
- **Database:** PostgreSQL
- **ORM:** Prisma

## 3. Paleta de Cores (Identidade Visual)

- **Background Principal:** `#0B1120` (Azul Marinho Quase Preto / Slate 950)
- **Background Secundário (Cards):** `#1E293B` (Slate 800 com transparência)
- **Destaque (Gold):** `#FFD700` (Ouro)
- **Texto Primário:** `#F8FAFC` (Slate 50)
- **Texto Secundário:** `#94A3B8` (Slate 400)
- **Bordas:** `#334155` (Slate 700)

## 4. Modelagem de Dados (Sugestão Prisma Schema)

```prisma
model Client {
  id        String   @id @default(uuid())
  name      String
  phone     String
  document  String   @unique // CPF/CNPJ
  orders    ServiceOrder[]
  sales     Sale[]
}

model ServiceOrder {
  id            String   @id @default(uuid())
  ticketNumber  Int      @default(autoincrement())
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Aparelho
  deviceModel   String
  deviceBrand   String
  imeiSerial    String?
  passcode      String?

  // Detalhes
  clientReport  String   // Relato do cliente
  techReport    String?  // Laudo técnico
  entryChecklist Json?   // Estado físico (arranhões, tela, etc)

  status        String   @default("ABERTO") // ABERTO, ANALISE, APROVADO, PRONTO, ENTREGUE

  clientId      String
  client        Client   @relation(fields: [clientId], references: [id])
}
```
