'use client';

import { useMemo, useState, useTransition } from 'react';
import { AppButton } from '@/components/app/app-button';
import { AppCard } from '@/components/app/app-card';
import { LeftRightGauge } from '@/components/boussole/left-right-gauge';
import { saveBoussoleResultAction } from '@/lib/actions/boussole';
import {
  computeBoussole,
  computeLeftRight,
  type PartyPosition,
  type Stance,
  type ThesisAxisWeights,
} from '@/lib/boussole/scoring';
import { clientLog } from '@/lib/client-log';
import type { BoussoleThesis } from '@/lib/data/public/boussole';

const STANCE_OPTIONS: { value: Stance; label: string }[] = [
  { value: 'agree', label: 'D’accord' },
  { value: 'neutral', label: 'Neutre' },
  { value: 'disagree', label: 'Pas d’accord' },
];

export function BoussoleQuiz({
  theses,
  parties,
  axisWeights,
  isAuthenticated,
}: {
  theses: BoussoleThesis[];
  parties: PartyPosition[];
  axisWeights: ThesisAxisWeights;
  isAuthenticated: boolean;
}) {
  const [answers, setAnswers] = useState<Record<number, Stance>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>(
    'idle',
  );
  const [isSaving, startSaving] = useTransition();

  const answeredCount = Object.keys(answers).length;

  const results = useMemo(
    () => (submitted ? computeBoussole(answers, parties) : []),
    [submitted, answers, parties],
  );
  const leftRight = useMemo(
    () => (submitted ? computeLeftRight(answers, axisWeights) : 0),
    [submitted, answers, axisWeights],
  );

  if (submitted) {
    const top = results[0];

    const handleSave = () => {
      startSaving(async () => {
        try {
          await saveBoussoleResultAction({
            leftRight,
            topPartySlug: top?.party_slug ?? null,
            answers,
          });
          setSaveState('saved');
        } catch (error) {
          setSaveState('error');
          clientLog('boussole').error('boussole.save.client_failed', {
            message: error instanceof Error ? error.message : 'unknown',
          });
        }
      });
    };

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

        <AppCard className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Ta position gauche ↔ droite
          </p>
          <LeftRightGauge value={leftRight} />
          {isAuthenticated ? (
            <div className="space-y-1">
              <AppButton
                variant="secondary"
                size="md"
                disabled={isSaving || saveState === 'saved'}
                onClick={handleSave}
              >
                {saveState === 'saved'
                  ? '✓ Position enregistrée'
                  : isSaving
                    ? 'Enregistrement…'
                    : 'Enregistrer ma position'}
              </AppButton>
              {saveState === 'saved' ? (
                <p className="text-xs text-muted-foreground">
                  Retrouve ton évolution sur ton profil (/me).
                </p>
              ) : null}
              {saveState === 'error' ? (
                <p className="text-xs text-destructive">
                  Enregistrement impossible. Réessaie.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Connecte-toi pour suivre l’évolution de ta position dans le temps.
            </p>
          )}
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
