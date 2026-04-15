import { PostComposer } from "@/components/home/post-composer";
import { PageContainer } from "@/components/layout/page-container";
import { createPostAction } from "@/lib/actions/posts";
import { requireSession } from "@/lib/guards/require-session";

export default async function NewPostPage() {
  await requireSession("/post/new");

  return (
    <PageContainer>
      <PostComposer action={createPostAction} redirectPath="/" />
    </PageContainer>
  );
}

