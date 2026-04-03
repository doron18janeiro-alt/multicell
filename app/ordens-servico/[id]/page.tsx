import { redirect } from "next/navigation";

type ServiceOrderAliasDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ServiceOrderAliasDetailPage({
  params,
}: ServiceOrderAliasDetailPageProps) {
  const { id } = await params;
  redirect(`/os/${id}`);
}
