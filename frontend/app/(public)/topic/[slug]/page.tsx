import { redirect } from "next/navigation";
import type { Route } from "next";

export default async function TopicRedirectPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/thread/${slug}` as Route);
}
