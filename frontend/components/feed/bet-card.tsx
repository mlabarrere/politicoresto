import { placeBetAction } from "@/lib/actions/bets";
import type { PredictionOptionRow, PredictionQuestionRow, ThreadPostView } from "@/lib/types/views";

type ExtendedQuestion = PredictionQuestionRow & {
  min_numeric_value?: number | null;
  max_numeric_value?: number | null;
  min_date_value?: string | null;
  max_date_value?: string | null;
  ordinal_min?: number | null;
  ordinal_max?: number | null;
  thread_post_id?: string | null;
};

export function BetCard({
  threadId,
  threadPost,
  question,
  options,
  redirectPath
}: {
  threadId: string;
  threadPost: ThreadPostView | null;
  question: ExtendedQuestion;
  options: PredictionOptionRow[];
  redirectPath: string;
}) {
  const ordinalValues =
    question.prediction_type === "ordinal_scale" &&
    typeof question.ordinal_min === "number" &&
    typeof question.ordinal_max === "number"
      ? Array.from(
          { length: question.ordinal_max - question.ordinal_min + 1 },
          (_, index) => question.ordinal_min! + index
        )
      : [];

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="eyebrow">Pari</p>
      <h3 className="mt-1 text-base font-semibold text-foreground">{question.title}</h3>

      <form action={placeBetAction} className="mt-4 space-y-4">
        <input type="hidden" name="thread_id" value={threadId} />
        <input type="hidden" name="thread_post_id" value={threadPost?.id ?? question.thread_post_id ?? ""} />
        <input type="hidden" name="prediction_type" value={question.prediction_type} />
        <input type="hidden" name="redirect_path" value={redirectPath} />

        {question.prediction_type === "binary" ? (
          <div className="grid grid-cols-2 gap-2">
            <button type="submit" name="answer_boolean" value="true" className="rounded-xl border border-border px-4 py-3 text-sm font-medium hover:bg-muted">
              Oui
            </button>
            <button type="submit" name="answer_boolean" value="false" className="rounded-xl border border-border px-4 py-3 text-sm font-medium hover:bg-muted">
              Non
            </button>
          </div>
        ) : question.prediction_type === "categorical_closed" ? (
          <div className="space-y-2">
            {options.map((option) => (
              <label key={option.id} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2 text-sm hover:bg-muted/50">
                <input type="radio" name="answer_option_id" value={option.id} className="accent-black" />
                <span>{option.label}</span>
              </label>
            ))}
            <div className="flex justify-end">
              <button type="submit" className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background">
                Parier
              </button>
            </div>
          </div>
        ) : question.prediction_type === "date_value" ? (
          <div className="space-y-3">
            <input
              type="date"
              name="answer_date"
              min={question.min_date_value ?? undefined}
              max={question.max_date_value ?? undefined}
              className="w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
            <button type="submit" className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background">
              Parier
            </button>
          </div>
        ) : question.prediction_type === "ordinal_scale" ? (
          <div className="space-y-3">
            <select name="answer_ordinal" className="w-full rounded-xl border border-border px-3 py-2 text-sm">
              <option value="">Choisir</option>
              {ordinalValues.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background">
              Parier
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              type="number"
              step="any"
              min={question.min_numeric_value ?? undefined}
              max={question.max_numeric_value ?? undefined}
              name="answer_numeric"
              className="w-full rounded-xl border border-border px-3 py-2 text-sm"
              placeholder={question.unit_label ?? "Valeur"}
            />
            <button type="submit" className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background">
              Parier
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
