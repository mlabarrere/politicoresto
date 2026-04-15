import { ForumPage } from "@/components/forum/forum-page";
import { PageContainer } from "@/components/layout/page-container";
import type { CommentTreeNode, ForumPost } from "@/lib/types/forum";

function seedComments(): CommentTreeNode[] {
  return [
    {
      id: "c-root-1",
      author: { id: "u1", username: "Alice" },
      createdAt: "2026-04-14T01:00:00.000Z",
      updatedAt: "2026-04-14T01:00:00.000Z",
      body: "Commentaire parent",
      depth: 0,
      parentCommentId: null,
      leftCount: 1,
      rightCount: 0,
      currentUserVote: null,
      replyCount: 1,
      isEdited: false,
      children: [
        {
          id: "c-child-1",
          author: { id: "u3", username: "Charlie" },
          createdAt: "2026-04-14T02:00:00.000Z",
          updatedAt: "2026-04-14T02:00:00.000Z",
          body: "Sous commentaire",
          depth: 1,
          parentCommentId: "c-root-1",
          leftCount: 0,
          rightCount: 1,
          currentUserVote: null,
          replyCount: 1,
          isEdited: false,
          children: [
            {
              id: "c-deep-1",
              author: { id: "u4", username: "Dana" },
              createdAt: "2026-04-14T03:00:00.000Z",
              updatedAt: "2026-04-14T03:00:00.000Z",
              body: "Niveau profond",
              depth: 7,
              parentCommentId: "c-child-1",
              leftCount: 0,
              rightCount: 0,
              currentUserVote: null,
              replyCount: 0,
              isEdited: false,
              children: []
            }
          ]
        }
      ]
    },
    {
      id: "c-root-2",
      author: { id: "u5", username: "Eve" },
      createdAt: "2026-04-14T04:00:00.000Z",
      updatedAt: "2026-04-14T04:00:00.000Z",
      body: "Autre branche",
      depth: 0,
      parentCommentId: null,
      leftCount: 0,
      rightCount: 0,
      currentUserVote: null,
      replyCount: 0,
      isEdited: false,
      children: []
    }
  ];
}

const POST: ForumPost = {
  id: "op-lab-1",
  author: { id: "u1", username: "Alice" },
  createdAt: "2026-04-14T00:00:00.000Z",
  body: "Post de laboratoire",
  leftCount: 2,
  rightCount: 1,
  commentCount: 2,
  currentUserVote: null
};

export default async function ForumLabPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const auth = params.auth === "0" ? null : "u1";

  return (
    <PageContainer>
      <div className="mx-auto max-w-4xl space-y-4">
        <h1 className="text-2xl font-semibold">Forum Lab</h1>
        <ForumPage post={POST} comments={seedComments()} currentUserId={auth} postSlug="forum-lab" />
      </div>
    </PageContainer>
  );
}

