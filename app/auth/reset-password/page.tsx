import { redirect } from "next/navigation";

export default async function LegacyResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    redirect("/login");
  }

  redirect(`/reset-password/${encodeURIComponent(token)}`);
}
