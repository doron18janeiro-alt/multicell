import { redirect } from "next/navigation";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { CompanyProfileSettings } from "@/components/CompanyProfileSettings";

export const dynamic = "force-dynamic";

export default async function CompanySettingsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role === "CONTADOR") {
    redirect("/configuracoes/contador?access=restricted");
  }

  if (!isAdminUser(currentUser)) {
    redirect("/dashboard");
  }

  return <CompanyProfileSettings />;
}
