import { notFound } from "next/navigation";

import { AppCard } from "@/components/app/app-card";
import { PublicProfileTabs } from "@/components/profile/public-profile-tabs";
import { PageContainer } from "@/components/layout/page-container";
import { getPublicProfile } from "@/lib/data/public/profile";

export default async function PublicProfilePage({
  params
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const data = await getPublicProfile(username);

  if (!data) {
    notFound();
  }

  return (
    <PageContainer>
      <div className="mx-auto max-w-4xl space-y-4">
        <AppCard className="space-y-2 p-4">
          <p className="text-sm text-muted-foreground">Profil public</p>
          <h1 className="text-2xl font-semibold text-foreground">
            @{data.profile.username}
          </h1>
          {data.profile.bio ? <p className="text-sm text-foreground/90">{data.profile.bio}</p> : null}
        </AppCard>

        <PublicProfileTabs posts={data.posts} comments={data.comments} />
      </div>
    </PageContainer>
  );
}
