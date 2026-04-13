import { votePollAction } from "@/lib/actions/polls";
import type { PollQuestionRow, PollRow, PublicPollResultsView } from "@/lib/types/views";
import { formatNumber } from "@/lib/utils/format";

export function PollCard({
  poll,
  questions,
  redirectPath
}: {
  poll: PollRow;
  questions: Array<PollQuestionRow & { options: Array<{ id: string; label: string }>; results: PublicPollResultsView[] }>;
  redirectPath: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-4">
        <p className="eyebrow">Sondage</p>
        <h3 className="mt-1 text-base font-semibold text-foreground">{poll.title}</h3>
        {poll.description ? <p className="mt-2 text-sm text-muted-foreground">{poll.description}</p> : null}
      </div>

      <form action={votePollAction} className="space-y-5">
        <input type="hidden" name="poll_id" value={poll.id} />
        <input type="hidden" name="redirect_path" value={redirectPath} />

        {questions.map((question) => (
          <fieldset key={question.id} className="space-y-3">
            <legend className="text-sm font-medium text-foreground">{question.prompt}</legend>
            <div className="space-y-2">
              {question.options.map((option) => {
                const count =
                  question.results.find((entry) => entry.poll_option_id === option.id)?.response_count ?? 0;

                return (
                  <label
                    key={option.id}
                    className="flex cursor-pointer items-center justify-between rounded-xl border border-border px-3 py-2 text-sm hover:bg-muted/50"
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="radio"
                        name={`question:${question.id}`}
                        value={`option:${option.id}`}
                        className="accent-black"
                      />
                      <span>{option.label}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">{formatNumber(count)}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}

        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            Voter
          </button>
        </div>
      </form>
    </div>
  );
}
