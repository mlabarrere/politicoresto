import type { PropsWithChildren } from 'react';

export function PageContainer({ children }: PropsWithChildren) {
  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-10 lg:px-10">
      {children}
    </div>
  );
}
