import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import type { TopicSummaryView } from "@/lib/types/views";

export function TopicSummaryList({ topics }: { topics: TopicSummaryView[] }) {
  return (
    <ul className="space-y-3">
      {topics.map((topic) => (
        <li key={topic.id}>
          <Card className="border-border shadow-sm">
            <CardContent className="p-4">
              <Link
                href={`/topic/${topic.slug}`}
                className="text-base font-semibold text-foreground transition hover:text-primary"
              >
                {topic.title}
              </Link>
              <p className="mt-1 text-sm text-muted-foreground">
                {topic.description ?? "Sujet sans description publique."}
              </p>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
