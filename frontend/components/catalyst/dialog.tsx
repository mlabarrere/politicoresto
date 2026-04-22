'use client';

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from '@headlessui/react';
import clsx from 'clsx';
import type { ReactNode } from 'react';

export function CatalystDialog({
  open,
  onClose,
  title,
  children,
  side = 'center',
}: {
  open: boolean;
  onClose: (open: boolean) => void;
  title?: string;
  side?: 'center' | 'right' | 'left' | 'bottom';
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-black/20 backdrop-blur-[1px]" />
      <div className="fixed inset-0 flex items-end justify-center p-4 sm:items-center">
        <DialogPanel
          className={clsx(
            'w-full rounded-2xl border border-border bg-white p-4 shadow-[var(--shadow-md)]',
            side === 'center' && 'max-w-lg',
            side === 'right' &&
              'ml-auto h-full max-w-sm rounded-r-none rounded-l-2xl',
            side === 'left' &&
              'mr-auto h-full max-w-sm rounded-l-none rounded-r-2xl',
            side === 'bottom' && 'max-w-2xl rounded-b-none',
          )}
        >
          {title ? (
            <DialogTitle className="text-base font-semibold text-foreground">
              {title}
            </DialogTitle>
          ) : null}
          <div className={clsx(title && 'mt-3')}>{children}</div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
