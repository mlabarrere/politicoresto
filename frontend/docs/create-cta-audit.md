# Create CTA Audit - Global Unification

## Removed or redirected legacy entrypoints

- `components/home/create-post-cta.tsx` -> removed; replaced by global `AppPrimaryCTA`.
- `components/home/homepage-shell.tsx` floating CTA usage -> removed.
- `components/home/right-sidebar.tsx` embedded CTA card -> removed.
- `components/home/right-sidebar.tsx` link `Nouveau post` -> removed.
- `components/home/right-sidebar.tsx` link `Brouillons` (`/post/new?draft=1`) -> removed.
- `components/layout/site-header.tsx` -> replaced by `components/layout/app-header.tsx` with standard primary CTA.

## Global entrypoints now

- Desktop + mobile header: `AppPrimaryCTA` in `AppHeader`.
- Mobile FAB: `AppPrimaryCTA` in `AppShell`.
- Create flow: direct navigation to `/post/new` (no drawer global).
