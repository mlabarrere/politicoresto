'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PlusSquare, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/', label: 'Fil', Icon: Home },
  { href: '/post/new', label: 'Créer', Icon: PlusSquare },
  { href: '/me', label: 'Profil', Icon: User },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 flex h-16 items-center justify-around border-t border-border bg-background lg:hidden">
      {NAV_ITEMS.map(({ href, label, Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center gap-0.5 px-4 py-2 text-xs transition-colors',
              active
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className={cn('size-5', active && 'stroke-[2.5]')} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
