import RegisterSessionsPageClient from "./register-sessions-client";

export default async function RegisterSessionsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <RegisterSessionsPageClient slug={slug} />;
}

