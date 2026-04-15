import { ThreadComposer } from "@/components/home/thread-composer";
import { PageContainer } from "@/components/layout/page-container";
import { createThreadAction } from "@/lib/actions/threads";
import { requireSession } from "@/lib/guards/require-session";

export default async function NewThreadPage() {
  await requireSession("/thread/new");

  return (
    <PageContainer>
      <ThreadComposer action={createThreadAction} redirectPath="/" />
    </PageContainer>
  );
}

