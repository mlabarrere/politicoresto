"use client";

import { Plus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { AppButton } from "@/components/app/app-button";

function toSafeNext(pathname: string | null): string {
  if (!pathname || !pathname.startsWith("/")) return "/";
  if (pathname.startsWith("//")) return "/";
  return pathname;
}

export function AppPrimaryCTA({
  mode = "inline",
  isAuthenticated
}: {
  mode?: "inline" | "fab";
  isAuthenticated: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const className = mode === "fab" ? "shadow-[var(--shadow-md)]" : undefined;

  function handleClick() {
    if (!isAuthenticated) {
      const next = toSafeNext(pathname);
      router.push(`/auth/login?next=${encodeURIComponent(next)}`);
      return;
    }

    router.push("/post/new");
  }

  return (
    <AppButton
      type="button"
      variant="primary"
      size={mode === "fab" ? "md" : "sm"}
      className={className}
      icon={<Plus className="size-4" />}
      aria-label="Creer"
      onClick={handleClick}
    >
      Creer
    </AppButton>
  );
}
