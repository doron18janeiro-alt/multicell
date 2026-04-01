import { redirect } from "next/navigation";

export default async function LegacyResetPasswordTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!token) {
    redirect("/login");
  }

  redirect(`/reset-password/${encodeURIComponent(token)}`);
}
