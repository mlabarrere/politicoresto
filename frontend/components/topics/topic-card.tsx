import Link from "next/link";
import { ArrowRight, Clock3, Flame, MessagesSquare, Sparkles } from "lucide-react";

import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ui/status-badge";
import type { HomeFeedTopicView } from "@/lib/types/views";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/utils/format";

type TopicCardProps = {
  topic: HomeFeedTopicView;
  featured?: boolean;
};

const lifecycleLabels: Record<string, string> = {
  open: "Ouvert",
  locked: "Ferme",
  pending_resolution: "En attente de resultat",
  resolved: "Resolu",
  archived: "Archive"
};

const lifecycleTones: Record<string, Parameters<typeof StatusBadge>[0]["tone"]> = {
  open: "info",
  locked: "muted",
  pending_resolution: "warning",
  resolved: "success",
  archived: "default"
};

const predictionTypeLabels: Record<string, string> = {
  binary: "Binaire",
  date_value: "Date",
  categorical_closed: "Choix",
  bounded_percentage: "Pourcentage",
  bounded_volume: "Volume",
  bounded_integer: "Entier",
  ordinal_scale: "Echelle",
  prediction_market: "Prediction"
};

function getPrimaryActionLabel(derivedLifecycleState: string) {
  switch (derivedLifecycleState) {
    case "open":
      return "Participer";
    case "pending_resolution":
      return "Suivre";
    case "resolved":
      return "Voir le resultat";
    default:
      return "Ouvrir le sujet";
  }
}

function renderAggregateValue(value: string | number | null) {
  if (value === null || value === undefined || value === "") {
    return "Non renseigne";
  }

  return String(value);
}

function getFeedSignal(topic: HomeFeedTopicView) {
  switch (topic.feed_reason_code) {
    case "high_activity":
      return { label: "Activite", icon: Flame };
    case "pending_resolution":
    case "closing_soon":
      return { label: "Calendrier", icon: Clock3 };
    default:
      return { label: "Signal", icon: Sparkles };
  }
}

export function TopicCard({ topic, featured = false }: TopicCardProps) {
  const payload = topic.topic_card_payload;
  const aggregate = payload.aggregate_payload;
  const metrics = payload.metrics_payload;
  const discussion = payload.discussion_payload;
  const reward = payload.card_payload;
  const resolution = payload.resolution_payload;
  const feedSignal = getFeedSignal(topic);

  return (
    <Card
      className={cn(
        "overflow-hidden border-border bg-card transition-colors hover:border-primary/30",
        featured && "border-primary/30 bg-accent/30"
      )}
    >
      <CardHeader className="gap-4 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge
            label={lifecycleLabels[topic.derived_lifecycle_state] ?? topic.derived_lifecycle_state}
            tone={lifecycleTones[topic.derived_lifecycle_state] ?? "default"}
          />
          {topic.prediction_type ? (
            <StatusBadge
              label={predictionTypeLabels[topic.prediction_type] ?? topic.prediction_type}
              tone="muted"
            />
          ) : null}
          {topic.primary_territory_name ? (
            <StatusBadge label={topic.primary_territory_name} tone="info" />
          ) : null}
          {topic.space_name ? <StatusBadge label={topic.space_name} tone="accent" /> : null}
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="eyebrow text-primary">{feedSignal.label}</span>
            <span className="inline-flex items-center gap-1.5">
              <feedSignal.icon className="size-4" />
              {topic.feed_reason_label}
            </span>
          </div>
          <div className="space-y-2">
            <Link
              href={`/topic/${topic.topic_slug}`}
              className="block text-balance text-xl font-semibold leading-tight tracking-tight text-foreground transition hover:text-primary"
            >
              {topic.topic_title}
            </Link>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              {topic.topic_description ?? "Sujet public visible et directement consultable."}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(220px,0.9fr)]">
          <div className="rounded-lg border border-border bg-muted/60 p-4">
            <p className="eyebrow">Question</p>
            <p className="mt-3 text-base font-semibold leading-7 text-foreground">
              {topic.prediction_question_title ?? "Question non renseignee."}
            </p>
            <div className="mt-5 flex flex-wrap items-end gap-6">
              <div>
                <p className="eyebrow">{aggregate.primary_label ?? "Lecture dominante"}</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                  {renderAggregateValue(aggregate.primary_value)}
                  {aggregate.unit_label ? (
                    <span className="ml-1 font-sans text-base font-semibold text-muted-foreground">
                      {aggregate.unit_label}
                    </span>
                  ) : null}
                </p>
              </div>
              {aggregate.secondary_label && aggregate.secondary_value !== null ? (
                <div>
                  <p className="eyebrow">{aggregate.secondary_label}</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {renderAggregateValue(aggregate.secondary_value)}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-background p-4">
            <p className="eyebrow">En bref</p>
            <div className="mt-4 grid gap-4 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 size-4 text-primary" />
                <div>
                  <p className="font-semibold text-foreground">
                    {formatNumber(metrics.active_prediction_count)} participations
                  </p>
                  <p>Participation visible sur le sujet</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MessagesSquare className="mt-0.5 size-4 text-sky-700" />
                <div>
                  <p className="font-semibold text-foreground">
                    {formatNumber(metrics.visible_post_count)} messages visibles
                  </p>
                  <p>Discussion visible autour du sujet</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock3 className="mt-0.5 size-4 text-amber-700" />
                <div>
                  <p className="font-semibold text-foreground">
                    {metrics.time_label ?? "Calendrier non renseigne"}
                  </p>
                  <p>Prochaine date utile</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {discussion.excerpt_text ? (
          <div className="rounded-lg border border-border bg-background p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="eyebrow">{discussion.excerpt_type ?? "Discussion"}</p>
              <p className="text-xs text-muted-foreground">Extrait</p>
            </div>
            {discussion.excerpt_title ? (
              <p className="mt-3 text-sm font-semibold text-foreground">
                {discussion.excerpt_title}
              </p>
            ) : null}
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{discussion.excerpt_text}</p>
          </div>
        ) : null}

        {reward || (topic.derived_lifecycle_state === "resolved" && resolution.resolved_label) ? (
          <>
            <Separator />
            <div className="grid gap-4 lg:grid-cols-2">
              {reward ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="eyebrow text-amber-800">Carte liee</p>
                  <div className="mt-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {reward.primary_card_label}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Ce sujet peut aussi enrichir votre collection.
                      </p>
                    </div>
                    <StatusBadge label={reward.primary_card_rarity} tone="accent" />
                  </div>
                </div>
              ) : null}

              {topic.derived_lifecycle_state === "resolved" && resolution.resolved_label ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <p className="eyebrow text-emerald-800">Resultat</p>
                  <p className="mt-3 text-sm font-semibold text-foreground">
                    {resolution.resolved_label}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Le sujet est maintenant archive avec son resultat visible.
                  </p>
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </CardContent>

      <CardFooter className="flex flex-wrap items-center gap-3 border-t border-border bg-background/70">
        <Link
          href={`/topic/${topic.topic_slug}`}
          className={cn(buttonVariants({ size: featured ? "lg" : "default" }))}
        >
          {getPrimaryActionLabel(topic.derived_lifecycle_state)}
        </Link>
        <Link
          href={`/topic/${topic.topic_slug}`}
          className={cn(buttonVariants({ variant: "outline", size: "default" }))}
        >
          Voir la discussion
        </Link>
        {topic.space_slug ? (
          <Link
            href={`/space/${topic.space_slug}`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition hover:text-primary/80"
          >
            Ouvrir l'espace
            <ArrowRight className="size-4" />
          </Link>
        ) : null}
      </CardFooter>
    </Card>
  );
}
