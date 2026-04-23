'use client';

import { useEffect, useState } from 'react';
import { AppBanner } from '@/components/app/app-banner';
import { AppButton } from '@/components/app/app-button';

const DISMISS_KEY = 'politicoresto.completion-banner.dismissed';

export function CompletionBanner() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.sessionStorage.getItem(DISMISS_KEY) === '1') setHidden(true);
  }, []);

  if (hidden) return null;

  return (
    <AppBanner
      title="Complétez votre profil"
      body="Renseignez votre date de naissance et votre code postal pour améliorer la représentativité des sondages."
    >
      <div className="mt-3 flex justify-end">
        <AppButton
          variant="ghost"
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.sessionStorage.setItem(DISMISS_KEY, '1');
            }
            setHidden(true);
          }}
        >
          Plus tard
        </AppButton>
      </div>
    </AppBanner>
  );
}
