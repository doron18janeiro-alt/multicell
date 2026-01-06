import { redirect } from "next/navigation";

export default function RootPage() {
  // Redireciona automaticamente para a tela de login
  redirect("/login");
}
