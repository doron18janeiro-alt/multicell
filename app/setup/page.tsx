import { redirect } from "next/navigation";
import { SetupWizard } from "@/components/SetupWizard";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { ensureCompanyProfile } from "@/lib/company";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.segment) {
    redirect("/dashboard");
  }

  const companyProfile = await ensureCompanyProfile(currentUser.companyId);

  return (
    <SetupWizard
      mode="private"
      canEdit={isAdminUser(currentUser)}
      companyName={companyProfile.name || currentUser.companyName || "Sua Empresa Aqui"}
      companyDocument={companyProfile.cnpj || ""}
      companyPhone={companyProfile.phone || ""}
      companyAddress={companyProfile.address || ""}
      responsibleName={currentUser.fullName || currentUser.email}
    />
  );
}
