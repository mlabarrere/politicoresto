'use client';

import { Menu } from 'lucide-react';
import { AppButton } from '@/components/app/app-button';
import { AppDrawer } from '@/components/app/app-drawer';
import { politicalBlocs } from '@/lib/data/political-taxonomy';

export function MobileNavDrawer() {
  return (
    <div className="xl:hidden">
      <AppDrawer
        side="left"
        title="Repere rapide"
        trigger={
          <AppButton
            variant="secondary"
            size="sm"
            aria-label="Ouvrir les reperes"
            icon={<Menu className="size-4" />}
          >
            Reperes
          </AppButton>
        }
      >
        <div className="mt-2 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Sondages
          </p>
          <p className="rounded-xl bg-muted px-3 py-2 text-sm text-foreground">
            En cours
          </p>
          <p className="rounded-xl bg-muted px-3 py-2 text-sm text-foreground">
            Passes
          </p>

          <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Couleur politique
          </p>
          {politicalBlocs.map((bloc) => (
            <p
              key={bloc.slug}
              className="rounded-xl border border-border px-3 py-2 text-sm text-foreground"
            >
              {bloc.label}
            </p>
          ))}
        </div>
      </AppDrawer>
    </div>
  );
}
