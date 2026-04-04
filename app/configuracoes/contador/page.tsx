import { redirect } from "next/navigation";
import { AccountantPortal } from "@/components/AccountantPortal";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ContadorPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "ADMIN" && currentUser.role !== "CONTADOR") {
    redirect("/dashboard?access=denied");
  }

  return <AccountantPortal />;
}
