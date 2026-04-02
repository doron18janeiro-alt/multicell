import { redirect } from "next/navigation";
import { SetupWizard } from "@/components/SetupWizard";
import { getCurrentUser, isAdminUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.segment) {
    redirect("/dashboard");
  }

  return (
    <SetupWizard
      canEdit={isAdminUser(currentUser)}
      companyName={currentUser.companyName || "Minha Empresa"}
      responsibleName={currentUser.fullName || currentUser.email}
    />
  );
}
