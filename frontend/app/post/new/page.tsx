import { PostComposer } from "@/components/home/post-composer";
import { PageContainer } from "@/components/layout/page-container";
import { createPostAction } from "@/lib/actions/posts";
import { requireSession } from "@/lib/guards/require-session";

function toComposerErrorMessage(code: string | undefined) {
  if (!code) return null;
  if (code === "publish_failed") return "Publication impossible pour le moment. Reessayez.";
  return "Publication impossible pour le moment. Reessayez.";
}

export default async function NewPostPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireSession("/post/new");
  const { error } = await searchParams;
  return (
    <PageContainer>
      <PostComposer action={createPostAction} redirectPath="/" initialError={toComposerErrorMessage(error)} />
    </PageContainer>
  );
}

