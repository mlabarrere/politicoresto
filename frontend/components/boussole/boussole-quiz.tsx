'use client';

import { useMemo, useState } from 'react';
import { AppButton } from '@/components/app/app-button';
import { AppCard } from '@/components/app/app-card';
import {
  computeBoussole,
  type PartyPosition,
  type Stance,
} from '@/lib/boussole/scoring';
import type { BoussoleThesis } from '@/lib/data/public/boussole';

const STANCE_OPTIONS: { value: Stance; label: string }[] = [
  { value: 'agree', label: 'D’accord' },
  { value: 'neutral', label: 'Neutre' },
  { value: 'disagree', label: 'Pas d’accord' },
];

export function BoussoleQuiz({
  theses,
  parties,
}: {
  theses: BoussoleThesis[];
  parties: PartyPosition[];
}) {
  const [answers, setAnswers] = useState<Record<number, Stance>>({});
  const [submitted, setSubmitted] = useState(false);

  const answeredCount = Object.keys(answers).length;

  const results = useMemo(
    () => (submitted ? computeBoussole(answers, parties) : []),
    [submitted, answers, parties],
  );

  if (submitted) {
    const top = results[0];
    return (
      <div className="space-y-4">
        <AppCard className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Ton résultat
          </p>
          <h2 className="text-xl font-semibold text-foreground">
            {top ? `Le plus proche : ${top.party_name}` : 'Aucun résultat'}
          </h2>
          {top ? (
            <p className="text-sm text-muted-foreground">
              {Math.round(top.score * 100)} % de proximité.
            </p>
          ) : null}
        </AppCard>

        <ul className="space-y-2">
          {results.map((result, index) => (
            <li key={result.party_slug}>
              <AppButton
                href={`/n/${result.party_slug}`}
                variant={index === 0 ? 'primary' : 'secondary'}
                size="md"
                className="flex w-full items-center justify-between"
              >
                <span>{result.party_name}</span>
                <span>{Math.round(result.score * 100)} %</span>
              </AppButton>
            </li>
          ))}
        </ul>

        <div className="space-y-2">
          <AppButton
            variant="ghost"
            onClick={() => {
              setSubmitted(false);
              setAnswers({});
            }}
          >
            Refaire le test
          </AppButton>
          <p className="text-xs text-muted-foreground">
            ⚠️ Positions des partis illustratives (à sourcer).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ol className="space-y-4">
        {theses.map((thesis) => (
          <li key={thesis.ordering}>
            <AppCard className="space-y-3">
              <p className="font-medium text-foreground">{thesis.statement}</p>
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label="Votre position"
              >
                {STANCE_OPTIONS.map((option) => {
                  const selected = answers[thesis.ordering] === option.value;
                  return (
                    <AppButton
                      key={option.value}
                      variant={selected ? 'primary' : 'ghost'}
                      aria-pressed={selected}
                      onClick={() => {
                        setAnswers((previous) => ({
                          ...previous,
                          [thesis.ordering]: option.value,
                        }));
                      }}
                    >
                      {option.label}
                    </AppButton>
                  );
                })}
              </div>
            </AppCard>
          </li>
        ))}
      </ol>

      <AppButton
        variant="primary"
        size="lg"
        disabled={answeredCount === 0}
        onClick={() => {
          setSubmitted(true);
        }}
      >
        Voir mon résultat ({answeredCount}/{theses.length})
      </AppButton>
    </div>
  );
}
